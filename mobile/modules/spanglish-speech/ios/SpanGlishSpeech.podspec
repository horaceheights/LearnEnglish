require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'SpanGlishSpeech'
  s.version        = package['version']
  s.summary        = 'Native streaming speech capture for SpanGlish.'
  s.description    = 'An Expo module that streams microphone PCM to Azure Speech and writes local WAV recordings.'
  s.license        = { :type => 'UNLICENSED' }
  s.author         = 'SpanGlish'
  s.homepage       = 'https://expo.dev/'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/expo/expo.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'MicrosoftCognitiveServicesSpeech-iOS', '~> 1.51.1'

  s.frameworks = 'AVFoundation'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
