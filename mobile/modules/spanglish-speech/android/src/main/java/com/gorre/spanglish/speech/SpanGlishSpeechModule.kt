package com.gorre.spanglish.speech

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import com.microsoft.cognitiveservices.speech.CancellationReason
import com.microsoft.cognitiveservices.speech.PronunciationAssessmentConfig
import com.microsoft.cognitiveservices.speech.PronunciationAssessmentGradingSystem
import com.microsoft.cognitiveservices.speech.PronunciationAssessmentGranularity
import com.microsoft.cognitiveservices.speech.PropertyId
import com.microsoft.cognitiveservices.speech.ResultReason
import com.microsoft.cognitiveservices.speech.SpeechConfig
import com.microsoft.cognitiveservices.speech.SpeechRecognizer
import com.microsoft.cognitiveservices.speech.audio.AudioConfig
import com.microsoft.cognitiveservices.speech.audio.AudioStreamFormat
import com.microsoft.cognitiveservices.speech.audio.PushAudioInputStream
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.log10
import kotlin.math.sqrt

class SpanGlishSpeechModule : Module() {
  private val sampleRate = 16_000
  private val running = AtomicBoolean(false)
  private val executor = Executors.newSingleThreadExecutor()
  private val pcmBuffer = ByteArrayOutputStream()
  private var captureFuture: Future<*>? = null
  private var audioRecord: AudioRecord? = null
  private var audioStream: PushAudioInputStream? = null
  private var audioConfig: AudioConfig? = null
  private var speechConfig: SpeechConfig? = null
  private var pronunciationConfig: PronunciationAssessmentConfig? = null
  private var recognizer: SpeechRecognizer? = null
  private var startedAt = 0L
  @Volatile private var latestResultJson = ""
  @Volatile private var latestRecognizedText = ""
  @Volatile private var finalizedTranscript = ""

  override fun definition() = ModuleDefinition {
    Name("SpanGlishSpeech")
    Events("onSpeechLevel", "onSpeechProgress", "onSpeechResult", "onSpeechError", "onSpeechState")

    AsyncFunction("startAsync") { options: Map<String, String> ->
      start(options)
    }

    AsyncFunction<Map<String, String>>("stopAsync") {
      return@AsyncFunction stop()
    }

    OnDestroy {
      stop()
      executor.shutdownNow()
    }
  }

  private fun start(options: Map<String, String>) {
    if (running.get()) stop()
    val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable.")
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      throw IllegalStateException("Microphone permission has not been granted.")
    }

    val token = options["token"].orEmpty()
    val region = options["region"].orEmpty()
    val locale = options["locale"] ?: "en-US"
    val referenceText = options["referenceText"].orEmpty()
    require(token.isNotBlank() && region.isNotBlank() && referenceText.isNotBlank()) {
      "Token, region, and reference text are required."
    }

    val streamFormat = AudioStreamFormat.getWaveFormatPCM(sampleRate.toLong(), 16, 1)
    val pushStream = PushAudioInputStream.createPushStream(streamFormat)
    val inputConfig = AudioConfig.fromStreamInput(pushStream)
    val azureConfig = SpeechConfig.fromAuthorizationToken(token, region).apply {
      speechRecognitionLanguage = locale
      setProperty(PropertyId.SpeechServiceResponse_RequestWordLevelTimestamps, "true")
    }
    val assessmentConfig = PronunciationAssessmentConfig(
      referenceText,
      PronunciationAssessmentGradingSystem.HundredMark,
      PronunciationAssessmentGranularity.Phoneme,
      false,
    )
    val speechRecognizer = SpeechRecognizer(azureConfig, inputConfig)
    assessmentConfig.applyTo(speechRecognizer)

    speechRecognizer.recognizing.addEventListener { _, event ->
      val text = event.result?.text.orEmpty().trim()
      if (text.isNotBlank()) {
        val combined = listOf(finalizedTranscript, text).filter { it.isNotBlank() }.joinToString(" ")
        sendEvent("onSpeechProgress", mapOf("text" to combined))
      }
    }
    speechRecognizer.recognized.addEventListener { _, event ->
      val result = event.result ?: return@addEventListener
      if (result.reason != ResultReason.RecognizedSpeech) return@addEventListener
      val text = result.text.orEmpty().trim()
      val json = result.properties.getProperty(PropertyId.SpeechServiceResponse_JsonResult).orEmpty()
      if (text.isNotBlank()) {
        finalizedTranscript = listOf(finalizedTranscript, text).filter { it.isNotBlank() }.joinToString(" ")
        latestRecognizedText = finalizedTranscript
      }
      if (json.isNotBlank()) latestResultJson = json
      if (finalizedTranscript.isNotBlank()) sendEvent("onSpeechProgress", mapOf("text" to finalizedTranscript))
      if (json.isNotBlank()) sendEvent("onSpeechResult", mapOf("text" to finalizedTranscript, "json" to json))
    }
    speechRecognizer.canceled.addEventListener { _, event ->
      if (event.reason == CancellationReason.Error) {
        sendEvent("onSpeechError", mapOf("message" to (event.errorDetails ?: "Azure speech recognition failed.")))
      }
    }
    speechRecognizer.sessionStopped.addEventListener { _, _ ->
      sendEvent("onSpeechState", mapOf("state" to "stopped"))
    }

    audioStream = pushStream
    audioConfig = inputConfig
    speechConfig = azureConfig
    pronunciationConfig = assessmentConfig
    recognizer = speechRecognizer
    latestResultJson = ""
    latestRecognizedText = ""
    finalizedTranscript = ""
    pcmBuffer.reset()
    startedAt = System.currentTimeMillis()
    running.set(true)
    speechRecognizer.startContinuousRecognitionAsync().get()
    sendEvent("onSpeechState", mapOf("state" to "listening"))
    captureFuture = executor.submit { captureAudio(pushStream) }
  }

  private fun captureAudio(stream: PushAudioInputStream) {
    val minBuffer = AudioRecord.getMinBufferSize(
      sampleRate,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
    )
    if (minBuffer <= 0) {
      sendEvent("onSpeechError", mapOf("message" to "This device could not open the microphone."))
      running.set(false)
      return
    }
    val recorder = AudioRecord(
      MediaRecorder.AudioSource.VOICE_RECOGNITION,
      sampleRate,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      maxOf(minBuffer * 2, 4096),
    )
    audioRecord = recorder
    try {
      recorder.startRecording()
      val buffer = ByteArray(maxOf(minBuffer, 2048))
      var lastLevelEvent = 0L
      while (running.get()) {
        val bytesRead = recorder.read(buffer, 0, buffer.size)
        if (bytesRead <= 0) continue
        synchronized(pcmBuffer) { pcmBuffer.write(buffer, 0, bytesRead) }
        stream.write(buffer.copyOf(bytesRead))
        val now = System.currentTimeMillis()
        if (now - lastLevelEvent >= 80) {
          val levelDb = pcmLevelDb(buffer, bytesRead)
          sendEvent(
            "onSpeechLevel",
            mapOf(
              "active" to (levelDb > -48.0),
              "elapsedMs" to (now - startedAt).toInt(),
              "levelDb" to levelDb,
            ),
          )
          lastLevelEvent = now
        }
      }
    } catch (error: Exception) {
      if (running.get()) sendEvent("onSpeechError", mapOf("message" to (error.message ?: "Microphone capture failed.")))
    } finally {
      runCatching { recorder.stop() }
      recorder.release()
      if (audioRecord === recorder) audioRecord = null
      runCatching { stream.close() }
    }
  }

  private fun pcmLevelDb(buffer: ByteArray, bytesRead: Int): Double {
    var sumSquares = 0.0
    var count = 0
    var index = 0
    while (index + 1 < bytesRead) {
      val sample = ((buffer[index + 1].toInt() shl 8) or (buffer[index].toInt() and 0xff)).toShort().toDouble()
      sumSquares += sample * sample
      count += 1
      index += 2
    }
    if (count == 0) return -160.0
    val rms = sqrt(sumSquares / count)
    return if (rms <= 0.0) -160.0 else (20.0 * log10(rms / 32768.0)).coerceAtLeast(-160.0)
  }

  private fun stop(): Map<String, String> {
    if (!running.getAndSet(false)) {
      return mapOf("json" to latestResultJson, "text" to latestRecognizedText, "uri" to "")
    }
    runCatching { audioRecord?.stop() }
    runCatching { audioStream?.close() }
    runCatching { captureFuture?.get(2, TimeUnit.SECONDS) }
    runCatching { recognizer?.stopContinuousRecognitionAsync()?.get() }
    val recordingUri = writeRecording()
    closeResources()
    sendEvent("onSpeechState", mapOf("state" to "stopped"))
    return mapOf("json" to latestResultJson, "text" to latestRecognizedText, "uri" to recordingUri)
  }

  private fun writeRecording(): String {
    val context = appContext.reactContext ?: return ""
    val pcm = synchronized(pcmBuffer) { pcmBuffer.toByteArray() }
    if (pcm.isEmpty()) return ""
    val file = File(context.cacheDir, "pronunciation-${System.currentTimeMillis()}.wav")
    FileOutputStream(file).use { output ->
      val dataLength = pcm.size
      val byteRate = sampleRate * 2
      output.write("RIFF".toByteArray(Charsets.US_ASCII))
      writeLittleEndian(output, dataLength + 36, 4)
      output.write("WAVEfmt ".toByteArray(Charsets.US_ASCII))
      writeLittleEndian(output, 16, 4)
      writeLittleEndian(output, 1, 2)
      writeLittleEndian(output, 1, 2)
      writeLittleEndian(output, sampleRate, 4)
      writeLittleEndian(output, byteRate, 4)
      writeLittleEndian(output, 2, 2)
      writeLittleEndian(output, 16, 2)
      output.write("data".toByteArray(Charsets.US_ASCII))
      writeLittleEndian(output, dataLength, 4)
      output.write(pcm)
    }
    return file.toURI().toString()
  }

  private fun writeLittleEndian(output: FileOutputStream, value: Int, byteCount: Int) {
    repeat(byteCount) { offset -> output.write((value shr (offset * 8)) and 0xff) }
  }

  private fun closeResources() {
    runCatching { recognizer?.close() }
    runCatching { pronunciationConfig?.close() }
    runCatching { audioConfig?.close() }
    runCatching { audioStream?.close() }
    runCatching { speechConfig?.close() }
    recognizer = null
    pronunciationConfig = null
    audioConfig = null
    audioStream = null
    speechConfig = null
  }
}
