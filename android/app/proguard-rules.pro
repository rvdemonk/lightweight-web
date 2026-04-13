# kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class xyz.rigby3.lightweight.**$$serializer { *; }
-keepclassmembers class xyz.rigby3.lightweight.** { *** Companion; }
-keepclasseswithmembers class xyz.rigby3.lightweight.** { kotlinx.serialization.KSerializer serializer(...); }
