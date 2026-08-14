import AVFoundation
import ExpoModulesCore
import Foundation
import MicrosoftCognitiveServicesSpeech

public final class SpanGlishSpeechModule: Module {
  private enum CaptureMode {
    case idle
    case speech
    case recording
    case stopping
  }

  private struct CaptureSnapshot {
    let bytes: Int
    let durationMs: Int
    let maxLevelDb: Double
    let pcm: Data
  }

  private let sampleRate = 16_000.0
  private let stateQueue = DispatchQueue(label: "com.gorre.spanglish.speech.state")
  private let processingQueue = DispatchQueue(label: "com.gorre.spanglish.speech.processing")
  private let captureLock = NSLock()
  private let resultLock = NSLock()
  private let stateQueueKey = DispatchSpecificKey<UInt8>()

  private var mode: CaptureMode = .idle
  private var audioEngine: AVAudioEngine?
  private var converter: AVAudioConverter?
  private var converterInputFormat: AVAudioFormat?
  private var activeGeneration: UInt64?
  private var nextGeneration: UInt64 = 0
  private var pcmData = Data()
  private var startedAt = Date()
  private var lastLevelEventAt = Date.distantPast
  private var maxLevelDb = -160.0

  private var pushStream: SPXPushAudioInputStream?
  private var audioConfiguration: SPXAudioConfiguration?
  private var speechConfiguration: SPXSpeechConfiguration?
  private var pronunciationConfiguration: SPXPronunciationAssessmentConfiguration?
  private var recognizer: SPXSpeechRecognizer?
  private var latestResultJson = ""
  private var latestRecognizedText = ""
  private var finalizedTranscript = ""

  private var notificationObservers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("SpanGlishSpeech")
    Constant("implementationVersion") { 4 }
    Events("onSpeechLevel", "onSpeechProgress", "onSpeechResult", "onSpeechError", "onSpeechState")

    OnCreate {
      self.stateQueue.setSpecific(key: self.stateQueueKey, value: 1)
    }

    AsyncFunction("startAsync") { (options: [String: String]) in
      try self.onStateQueue {
        try self.startSpeech(options)
      }
    }

    AsyncFunction("stopAsync") { () -> [String: String] in
      self.onStateQueue {
        self.stopCapture()
      }
    }

    AsyncFunction("startRecordingAsync") {
      try self.onStateQueue {
        try self.startLocalRecording()
      }
    }

    AsyncFunction("stopRecordingAsync") { () -> [String: String] in
      self.onStateQueue {
        let result = self.stopCapture()
        return ["uri": result["uri"] ?? ""]
      }
    }

    OnDestroy {
      self.onStateQueue {
        _ = self.stopCapture()
        self.removeAudioSessionObservers()
      }
    }
  }

  private func startSpeech(_ options: [String: String]) throws {
    let token = options["token"] ?? ""
    let region = options["region"] ?? ""
    let locale = options["locale"] ?? "en-US"
    let referenceText = options["referenceText"] ?? ""
    guard !token.isEmpty, !region.isEmpty, !referenceText.isEmpty else {
      throw moduleError("invalid_options", "Token, region, and reference text are required.")
    }

    try requireMicrophonePermission()
    if mode != .idle {
      _ = stopCapture()
    }
    resetCaptureState()
    resetRecognitionState()
    registerAudioSessionObserversIfNeeded()
    mode = .speech

    do {
      let streamFormat = SPXAudioStreamFormat(
        usingPCMWithSampleRate: UInt(sampleRate),
        bitsPerSample: 16,
        channels: 1
      )
      guard let streamFormat,
            let stream = SPXPushAudioInputStream(audioFormat: streamFormat),
            let audioConfig = SPXAudioConfiguration(streamInput: stream) else {
        throw moduleError("azure_audio_config", "Azure Speech could not create its PCM input stream.")
      }

      let speechConfig = try SPXSpeechConfiguration(authorizationToken: token, region: region)
      speechConfig.speechRecognitionLanguage = locale
      speechConfig.outputFormat = .detailed
      speechConfig.requestWordLevelTimestamps()

      let assessment = try SPXPronunciationAssessmentConfiguration(
        referenceText,
        gradingSystem: .hundredMark,
        granularity: .phoneme,
        enableMiscue: true
      )
      assessment.phonemeAlphabet = "IPA"
      assessment.nbestPhonemeCount = 5
      if locale.caseInsensitiveCompare("en-US") == .orderedSame {
        assessment.enableProsodyAssessment()
      }

      let speechRecognizer = try SPXSpeechRecognizer(
        speechConfiguration: speechConfig,
        language: locale,
        audioConfiguration: audioConfig
      )
      try assessment.apply(to: speechRecognizer)
      installRecognizerHandlers(speechRecognizer)

      pushStream = stream
      audioConfiguration = audioConfig
      speechConfiguration = speechConfig
      pronunciationConfiguration = assessment
      recognizer = speechRecognizer

      try configureAndActivateAudioSession()
      try speechRecognizer.startContinuousRecognition()
      try installAndStartAudioEngine(reason: "start")
      emitState("listening")
      log("speech capture started locale=\(locale)")
    } catch {
      failStart(error)
      throw error
    }
  }

  private func startLocalRecording() throws {
    try requireMicrophonePermission()
    if mode != .idle {
      _ = stopCapture()
    }
    resetCaptureState()
    resetRecognitionState()
    registerAudioSessionObserversIfNeeded()
    mode = .recording

    do {
      try configureAndActivateAudioSession()
      try installAndStartAudioEngine(reason: "recording_start")
      emitState("recording")
      log("local recording started")
    } catch {
      failStart(error)
      throw error
    }
  }

  private func stopCapture() -> [String: String] {
    guard mode != .idle, mode != .stopping else {
      let result = recognitionSnapshot()
      return ["json": result.json, "text": result.text, "uri": ""]
    }

    let wasSpeech = mode == .speech
    mode = .stopping
    invalidateActiveGeneration()
    stopAudioEngine()
    processingQueue.sync {}
    processingQueue.sync {
      self.converter = nil
      self.converterInputFormat = nil
    }

    pushStream?.close()
    if wasSpeech, let recognizer {
      do {
        try recognizer.stopContinuousRecognition()
      } catch {
        emitError("azure_stop", error.localizedDescription)
      }
    }

    let capture = captureSnapshot()
    let uri = writeWaveFile(capture.pcm, prefix: wasSpeech ? "pronunciation" : "feedback")
    let recognition = recognitionSnapshot()
    releaseRecognitionResources()
    mode = .idle
    deactivateAudioSession()
    emitState("stopped", extras: [
      "bytes": capture.bytes,
      "durationMs": capture.durationMs,
      "maxLevelDb": capture.maxLevelDb,
      "uriProduced": !uri.isEmpty,
    ])
    log("capture stopped bytes=\(capture.bytes) durationMs=\(capture.durationMs) maxDb=\(capture.maxLevelDb)")
    return ["json": recognition.json, "text": recognition.text, "uri": uri]
  }

  private func configureAndActivateAudioSession() throws {
    let session = AVAudioSession.sharedInstance()
    var options: AVAudioSession.CategoryOptions = [.defaultToSpeaker]
#if compiler(>=6.2)
    if #available(iOS 26.0, *) {
      options.insert(.allowBluetoothHFP)
    } else {
      options.insert(.allowBluetooth)
    }
#else
    options.insert(.allowBluetooth)
#endif
    try session.setCategory(.playAndRecord, mode: .measurement, options: options)
    try session.setPreferredSampleRate(48_000)
    try session.setPreferredIOBufferDuration(0.02)
    try session.setActive(true)

    guard session.isInputAvailable else {
      throw moduleError("no_audio_input", "No microphone input route is available.")
    }
    emitState("session_ready")
    log("audio session active \(routeDescription(session))")
  }

  private func installAndStartAudioEngine(reason: String) throws {
    stopAudioEngine()
    let engine = AVAudioEngine()
    let input = engine.inputNode
    let inputFormat = input.outputFormat(forBus: 0)
    guard inputFormat.sampleRate > 0, inputFormat.channelCount > 0 else {
      throw moduleError("invalid_input_format", "The microphone returned an invalid audio format.")
    }

    let generation = beginGeneration()
    input.installTap(onBus: 0, bufferSize: 1_024, format: inputFormat) { [weak self] buffer, _ in
      self?.enqueueAudio(buffer, generation: generation)
    }
    engine.prepare()
    try engine.start()
    // Reassert ownership after the engine starts. This protects capture from a
    // playback component that is finishing its own delayed session teardown.
    try AVAudioSession.sharedInstance().setActive(true)
    audioEngine = engine
    emitState("engine_started", extras: [
      "engineReason": reason,
      "hardwareChannels": Int(inputFormat.channelCount),
      "hardwareSampleRate": inputFormat.sampleRate,
    ])
  }

  private func stopAudioEngine() {
    guard let engine = audioEngine else { return }
    engine.inputNode.removeTap(onBus: 0)
    engine.stop()
    audioEngine = nil
  }

  private func enqueueAudio(_ buffer: AVAudioPCMBuffer, generation: UInt64) {
    guard generationIsActive(generation), let copy = copyPCMBuffer(buffer) else { return }
    processingQueue.async { [weak self] in
      self?.processAudio(copy, generation: generation)
    }
  }

  private func processAudio(_ input: AVAudioPCMBuffer, generation: UInt64) {
    guard generationIsActive(generation) else { return }
    guard let targetFormat = AVAudioFormat(
      commonFormat: .pcmFormatFloat32,
      sampleRate: sampleRate,
      channels: 1,
      interleaved: false
    ) else {
      emitError("target_format", "The 16 kHz recording format could not be created.")
      return
    }

    if converter == nil || !formatsMatch(converterInputFormat, input.format) {
      converter = AVAudioConverter(from: input.format, to: targetFormat)
      converterInputFormat = input.format
    }
    guard let converter else {
      emitError("audio_converter", "The microphone format could not be converted to 16 kHz mono PCM.")
      return
    }

    let ratio = sampleRate / input.format.sampleRate
    let capacity = max(1, AVAudioFrameCount(ceil(Double(input.frameLength) * ratio)) + 64)
    guard let output = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: capacity) else { return }
    var suppliedInput = false
    var conversionError: NSError?
    let status = converter.convert(to: output, error: &conversionError) { _, outStatus in
      if suppliedInput {
        outStatus.pointee = .noDataNow
        return nil
      }
      suppliedInput = true
      outStatus.pointee = .haveData
      return input
    }
    if status == .error {
      emitError("audio_conversion", conversionError?.localizedDescription ?? "Microphone conversion failed.")
      return
    }
    guard output.frameLength > 0, let samples = output.floatChannelData?[0] else { return }

    let frameCount = Int(output.frameLength)
    var pcm = [Int16](repeating: 0, count: frameCount)
    var sumSquares = 0.0
    var peak = 0.0
    for index in 0..<frameCount {
      let sample = Double(max(-1.0, min(1.0, samples[index])))
      sumSquares += sample * sample
      peak = max(peak, abs(sample))
      pcm[index] = Int16(max(-32_768, min(32_767, Int((sample * 32_767.0).rounded()))))
    }
    let levelDb = decibels(sqrt(sumSquares / Double(frameCount)))
    let peakDb = decibels(peak)
    let chunk = pcm.withUnsafeBytes { Data($0) }

    captureLock.lock()
    guard activeGeneration == generation else {
      captureLock.unlock()
      return
    }
    pcmData.append(chunk)
    maxLevelDb = max(maxLevelDb, levelDb)
    let elapsedMs = Int(Date().timeIntervalSince(startedAt) * 1_000)
    let shouldEmitLevel = Date().timeIntervalSince(lastLevelEventAt) >= 0.08
    if shouldEmitLevel { lastLevelEventAt = Date() }
    captureLock.unlock()

    pushStream?.write(chunk)
    if shouldEmitLevel {
      sendEvent("onSpeechLevel", [
        "active": levelDb > -48.0,
        "elapsedMs": elapsedMs,
        "levelDb": levelDb,
        "peakDb": peakDb,
      ])
    }
  }

  private func installRecognizerHandlers(_ speechRecognizer: SPXSpeechRecognizer) {
    speechRecognizer.addRecognizingEventHandler { [weak self] _, event in
      guard let self else { return }
      let text = event.result.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      guard !text.isEmpty else { return }
      let finalized = self.finalizedText()
      self.sendEvent("onSpeechProgress", ["text": self.joinText(finalized, text)])
    }

    speechRecognizer.addRecognizedEventHandler { [weak self] _, event in
      guard let self else { return }
      let segment = event.result.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      let json = event.result.properties?.getPropertyBy(.speechServiceResponseJsonResult) ?? ""
      self.resultLock.lock()
      if !segment.isEmpty {
        self.finalizedTranscript = self.joinText(self.finalizedTranscript, segment)
        self.latestRecognizedText = self.finalizedTranscript
      }
      if !json.isEmpty { self.latestResultJson = json }
      let combined = self.finalizedTranscript
      self.resultLock.unlock()
      if !combined.isEmpty {
        self.sendEvent("onSpeechProgress", ["text": combined])
      }
      if !json.isEmpty {
        self.sendEvent("onSpeechResult", ["json": json, "segmentText": segment, "text": combined])
      }
    }

    speechRecognizer.addCanceledEventHandler { [weak self] _, event in
      let details = event.errorDetails ?? ""
      guard !details.isEmpty, details.range(of: "InitialSilenceTimeout", options: .caseInsensitive) == nil else {
        return
      }
      self?.emitError("azure_canceled", details)
    }

    speechRecognizer.addSessionStartedEventHandler { [weak self] _, event in
      self?.emitState("azure_session_started", extras: ["sessionId": event.sessionId])
    }
    speechRecognizer.addSessionStoppedEventHandler { [weak self] _, event in
      self?.emitState("azure_session_stopped", extras: ["sessionId": event.sessionId])
    }
  }

  private func registerAudioSessionObserversIfNeeded() {
    guard notificationObservers.isEmpty else { return }
    let center = NotificationCenter.default
    notificationObservers.append(center.addObserver(
      forName: AVAudioSession.interruptionNotification,
      object: AVAudioSession.sharedInstance(),
      queue: nil
    ) { [weak self] notification in
      self?.stateQueue.async { self?.handleInterruption(notification) }
    })
    notificationObservers.append(center.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: AVAudioSession.sharedInstance(),
      queue: nil
    ) { [weak self] notification in
      self?.stateQueue.async { self?.handleRouteChange(notification) }
    })
    notificationObservers.append(center.addObserver(
      forName: AVAudioSession.mediaServicesWereResetNotification,
      object: AVAudioSession.sharedInstance(),
      queue: nil
    ) { [weak self] _ in
      self?.stateQueue.async { self?.handleMediaServicesReset() }
    })
  }

  private func removeAudioSessionObservers() {
    for observer in notificationObservers {
      NotificationCenter.default.removeObserver(observer)
    }
    notificationObservers.removeAll()
  }

  private func handleInterruption(_ notification: Notification) {
    guard mode == .speech || mode == .recording,
          let rawType = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
          let type = AVAudioSession.InterruptionType(rawValue: rawType) else { return }
    switch type {
    case .began:
      audioEngine?.pause()
      emitState("interrupted")
    case .ended:
      let rawOptions = notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
      let options = AVAudioSession.InterruptionOptions(rawValue: rawOptions)
      guard options.contains(.shouldResume) else {
        emitError("interruption_not_resumable", "The audio interruption ended without permission to resume capture.")
        _ = stopCapture()
        return
      }
      do {
        try configureAndActivateAudioSession()
        if audioEngine?.isRunning == false {
          audioEngine?.prepare()
          try audioEngine?.start()
        }
        emitState("interruption_ended")
      } catch {
        emitError("interruption_resume", error.localizedDescription)
      }
    @unknown default:
      break
    }
  }

  private func handleRouteChange(_ notification: Notification) {
    guard mode == .speech || mode == .recording else { return }
    let rawReason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt ?? 0
    let reason = AVAudioSession.RouteChangeReason(rawValue: rawReason) ?? .unknown
    emitState("route_changed", extras: ["routeReason": Int(rawReason)])
    // Category changes are expected while taking ownership from Expo Audio.
    guard reason != .categoryChange, reason != .override else { return }
    do {
      try configureAndActivateAudioSession()
      try installAndStartAudioEngine(reason: "route_change_\(rawReason)")
    } catch {
      emitError("route_recovery", error.localizedDescription)
    }
  }

  private func handleMediaServicesReset() {
    guard mode == .speech || mode == .recording else { return }
    emitState("media_services_reset")
    do {
      try configureAndActivateAudioSession()
      try installAndStartAudioEngine(reason: "media_services_reset")
    } catch {
      emitError("media_services_reset", error.localizedDescription)
    }
  }

  private func requireMicrophonePermission() throws {
    switch AVAudioSession.sharedInstance().recordPermission {
    case .granted:
      return
    case .denied:
      throw moduleError("microphone_denied", "Microphone permission has been denied.")
    case .undetermined:
      throw moduleError("microphone_undetermined", "Microphone permission has not been requested yet.")
    @unknown default:
      throw moduleError("microphone_unknown", "Microphone permission is unavailable.")
    }
  }

  private func failStart(_ error: Error) {
    invalidateActiveGeneration()
    stopAudioEngine()
    processingQueue.sync {}
    pushStream?.close()
    if let recognizer {
      do {
        try recognizer.stopContinuousRecognition()
      } catch {
        log("Azure recognition cleanup failed after capture start error: \(error.localizedDescription)")
      }
    }
    releaseRecognitionResources()
    mode = .idle
    deactivateAudioSession()
    emitError("capture_start", error.localizedDescription)
  }

  private func releaseRecognitionResources() {
    pushStream?.close()
    pushStream = nil
    audioConfiguration = nil
    speechConfiguration = nil
    pronunciationConfiguration = nil
    recognizer = nil
  }

  private func resetCaptureState() {
    captureLock.lock()
    pcmData.removeAll(keepingCapacity: true)
    startedAt = Date()
    lastLevelEventAt = .distantPast
    maxLevelDb = -160.0
    activeGeneration = nil
    captureLock.unlock()
    processingQueue.sync {
      self.converter = nil
      self.converterInputFormat = nil
    }
  }

  private func resetRecognitionState() {
    resultLock.lock()
    latestResultJson = ""
    latestRecognizedText = ""
    finalizedTranscript = ""
    resultLock.unlock()
  }

  private func beginGeneration() -> UInt64 {
    captureLock.lock()
    nextGeneration &+= 1
    activeGeneration = nextGeneration
    let generation = nextGeneration
    captureLock.unlock()
    return generation
  }

  private func invalidateActiveGeneration() {
    captureLock.lock()
    activeGeneration = nil
    captureLock.unlock()
  }

  private func generationIsActive(_ generation: UInt64) -> Bool {
    captureLock.lock()
    let active = activeGeneration == generation
    captureLock.unlock()
    return active
  }

  private func captureSnapshot() -> CaptureSnapshot {
    captureLock.lock()
    let data = pcmData
    let peak = maxLevelDb
    let duration = Int(Date().timeIntervalSince(startedAt) * 1_000)
    captureLock.unlock()
    return CaptureSnapshot(bytes: data.count, durationMs: duration, maxLevelDb: peak, pcm: data)
  }

  private func recognitionSnapshot() -> (json: String, text: String) {
    resultLock.lock()
    let result = (json: latestResultJson, text: latestRecognizedText)
    resultLock.unlock()
    return result
  }

  private func finalizedText() -> String {
    resultLock.lock()
    let text = finalizedTranscript
    resultLock.unlock()
    return text
  }

  private func copyPCMBuffer(_ source: AVAudioPCMBuffer) -> AVAudioPCMBuffer? {
    guard let copy = AVAudioPCMBuffer(pcmFormat: source.format, frameCapacity: source.frameCapacity) else {
      return nil
    }
    copy.frameLength = source.frameLength
    let sourceBuffers = UnsafeMutableAudioBufferListPointer(source.mutableAudioBufferList)
    let destinationBuffers = UnsafeMutableAudioBufferListPointer(copy.mutableAudioBufferList)
    for index in 0..<min(sourceBuffers.count, destinationBuffers.count) {
      guard let sourceData = sourceBuffers[index].mData,
            let destinationData = destinationBuffers[index].mData else { continue }
      let byteCount = min(Int(sourceBuffers[index].mDataByteSize), Int(destinationBuffers[index].mDataByteSize))
      memcpy(destinationData, sourceData, byteCount)
      destinationBuffers[index].mDataByteSize = UInt32(byteCount)
    }
    return copy
  }

  private func formatsMatch(_ lhs: AVAudioFormat?, _ rhs: AVAudioFormat) -> Bool {
    guard let lhs else { return false }
    return lhs.sampleRate == rhs.sampleRate
      && lhs.channelCount == rhs.channelCount
      && lhs.commonFormat == rhs.commonFormat
      && lhs.isInterleaved == rhs.isInterleaved
  }

  private func writeWaveFile(_ pcm: Data, prefix: String) -> String {
    guard !pcm.isEmpty, pcm.count <= Int(UInt32.max) - 36 else { return "" }
    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent("\(prefix)-\(Int(Date().timeIntervalSince1970 * 1_000)).wav")
    var wave = Data()
    wave.append("RIFF".data(using: .ascii)!)
    appendLittleEndian(UInt32(pcm.count + 36), to: &wave)
    wave.append("WAVEfmt ".data(using: .ascii)!)
    appendLittleEndian(UInt32(16), to: &wave)
    appendLittleEndian(UInt16(1), to: &wave)
    appendLittleEndian(UInt16(1), to: &wave)
    appendLittleEndian(UInt32(sampleRate), to: &wave)
    appendLittleEndian(UInt32(sampleRate * 2), to: &wave)
    appendLittleEndian(UInt16(2), to: &wave)
    appendLittleEndian(UInt16(16), to: &wave)
    wave.append("data".data(using: .ascii)!)
    appendLittleEndian(UInt32(pcm.count), to: &wave)
    wave.append(pcm)
    do {
      try wave.write(to: url, options: .atomic)
      return url.absoluteString
    } catch {
      emitError("wav_write", error.localizedDescription)
      return ""
    }
  }

  private func appendLittleEndian<T: FixedWidthInteger>(_ value: T, to data: inout Data) {
    var littleEndian = value.littleEndian
    withUnsafeBytes(of: &littleEndian) { bytes in
      data.append(contentsOf: bytes)
    }
  }

  private func emitState(_ state: String, extras: [String: Any] = [:]) {
    let session = AVAudioSession.sharedInstance()
    var body: [String: Any] = [
      "channels": Int(session.inputNumberOfChannels),
      "inputRoute": inputRoute(session),
      "outputRoute": outputRoute(session),
      "sampleRate": session.sampleRate,
      "state": state,
    ]
    extras.forEach { body[$0.key] = $0.value }
    sendEvent("onSpeechState", body)
  }

  private func emitError(_ stage: String, _ message: String) {
    log("error stage=\(stage) message=\(message)")
    sendEvent("onSpeechError", ["message": message, "stage": stage])
  }

  private func inputRoute(_ session: AVAudioSession) -> String {
    session.currentRoute.inputs.map { "\($0.portType.rawValue):\($0.portName)" }.joined(separator: ",")
  }

  private func outputRoute(_ session: AVAudioSession) -> String {
    session.currentRoute.outputs.map { "\($0.portType.rawValue):\($0.portName)" }.joined(separator: ",")
  }

  private func routeDescription(_ session: AVAudioSession) -> String {
    "sampleRate=\(session.sampleRate) channels=\(session.inputNumberOfChannels) input=\(inputRoute(session)) output=\(outputRoute(session))"
  }

  private func deactivateAudioSession() {
    do {
      try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    } catch {
      log("audio session deactivation failed: \(error.localizedDescription)")
    }
  }

  private func joinText(_ lhs: String, _ rhs: String) -> String {
    [lhs, rhs].filter { !$0.isEmpty }.joined(separator: " ")
  }

  private func decibels(_ amplitude: Double) -> Double {
    amplitude <= 0 ? -160.0 : max(-160.0, 20.0 * log10(amplitude))
  }

  private func moduleError(_ code: String, _ message: String) -> NSError {
    NSError(domain: "SpanGlishSpeech", code: code.hashValue, userInfo: [NSLocalizedDescriptionKey: message])
  }

  private func log(_ message: String) {
    print("[SpanGlishSpeech/iOS] \(message)")
  }

  private func onStateQueue<T>(_ block: () throws -> T) rethrows -> T {
    if DispatchQueue.getSpecific(key: stateQueueKey) != nil {
      return try block()
    }
    return try stateQueue.sync(execute: block)
  }
}
