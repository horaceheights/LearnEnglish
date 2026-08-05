# Azure Speech includes optional token-credential overloads that SpanGlish does
# not call. azure-core is intentionally excluded on Android, so release R8 must
# not treat those unused optional types as required application classes.
-dontwarn com.azure.core.credential.**
-dontwarn reactor.core.publisher.Mono
