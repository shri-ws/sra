#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# 1. Locate Java
JAVA_BIN=""
JAVAC_BIN=""
KEYTOOL_BIN=""

for CANDIDATE in \
    "/Users/shridharmac/.gemini/antigravity/scratch/jdk/amazon-corretto-17.jdk/Contents/Home/bin" \
    "/opt/homebrew/opt/openjdk@17/bin" \
    "/opt/homebrew/opt/openjdk/bin" \
    "/usr/local/opt/openjdk/bin"; do
    if [ -x "$CANDIDATE/javac" ]; then
        JAVA_BIN="$CANDIDATE/java"
        JAVAC_BIN="$CANDIDATE/javac"
        KEYTOOL_BIN="$CANDIDATE/keytool"
        break
    fi
done

if [ -z "$JAVAC_BIN" ]; then
    if which javac >/dev/null 2>&1; then
        JAVA_BIN="$(which java)"
        JAVAC_BIN="$(which javac)"
        KEYTOOL_BIN="$(which keytool)"
    fi
fi

echo "Using Java: $JAVA_BIN"
echo "Using Javac: $JAVAC_BIN"
echo "Using Keytool: $KEYTOOL_BIN"

# Ensure JAVA_HOME is exported for d8 / apksigner
export JAVA_HOME="$(cd "$(dirname "$JAVA_BIN")/.." && pwd)"
export PATH="$JAVA_HOME/bin:$PATH"

# 2. Android SDK Tools
BUILD_TOOLS="/Users/shridharmac/Library/Android/sdk/build-tools/34.0.0"
PLATFORM_JAR="/Users/shridharmac/Library/Android/sdk/platforms/android-34/android.jar"
AAPT="$BUILD_TOOLS/aapt"
D8="$BUILD_TOOLS/d8"
ZIPALIGN="$BUILD_TOOLS/zipalign"
APKSIGNER="$BUILD_TOOLS/apksigner"

if [ ! -f "$PLATFORM_JAR" ]; then
    echo "ERROR: Android SDK platform jar not found at $PLATFORM_JAR"
    exit 1
fi

# 3. Clean and prepare build dirs
rm -rf bin gen
mkdir -p bin/classes gen

echo "==> Step 1: Generating R.java with AAPT..."
"$AAPT" package -f -m -J gen -M AndroidManifest.xml -S res -I "$PLATFORM_JAR"

echo "==> Step 2: Compiling Java source with javac..."
"$JAVAC_BIN" -source 8 -target 8 \
    -bootclasspath "$PLATFORM_JAR" \
    -cp "$PLATFORM_JAR" \
    -d bin/classes \
    gen/in/shriramjiastro/patrika/R.java \
    src/in/shriramjiastro/patrika/MainActivity.java

echo "==> Step 3: Translating bytecode to Dalvik classes.dex with d8..."
CLASS_FILES=$(find bin/classes -name "*.class")
"$D8" --lib "$PLATFORM_JAR" --output bin/ $CLASS_FILES

echo "==> Step 4: Packaging resources into unaligned APK..."
"$AAPT" package -f -M AndroidManifest.xml -S res -I "$PLATFORM_JAR" -F bin/unaligned.apk

echo "==> Step 5: Injecting classes.dex into APK..."
cd bin
"$AAPT" add unaligned.apk classes.dex
cd ..

echo "==> Step 6: Aligning APK with zipalign (4-byte boundary)..."
"$ZIPALIGN" -v -p 4 bin/unaligned.apk bin/aligned.apk

echo "==> Step 7: Generating signing keystore if needed..."
if [ ! -f release.keystore ]; then
    "$KEYTOOL_BIN" -genkeypair -v \
        -keystore release.keystore \
        -storepass shriramji123 \
        -alias sra \
        -keypass shriramji123 \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -dname "CN=Shri Ramji Astro, OU=Engineering, O=SRA, L=Ayodhya, ST=UP, C=IN"
fi

echo "==> Step 8: Cryptographically signing APK with apksigner (v1 + v2 + v3 schemes)..."
"$APKSIGNER" sign \
    --ks release.keystore \
    --ks-pass pass:shriramji123 \
    --ks-key-alias sra \
    --key-pass pass:shriramji123 \
    --out bin/patrika-astro.apk \
    bin/aligned.apk

echo "==> Step 9: Verifying APK signature..."
"$APKSIGNER" verify --verbose bin/patrika-astro.apk

echo "==> Step 10: Copying signed APK to release targets..."
TARGET_DIR="/Users/shridharmac/.gemini/antigravity/scratch/sra"
mkdir -p "$TARGET_DIR/downloads" "$TARGET_DIR/public/downloads"
cp bin/patrika-astro.apk "$TARGET_DIR/patrika-astro.apk"
cp bin/patrika-astro.apk "$TARGET_DIR/downloads/patrika-astro.apk"
cp bin/patrika-astro.apk "$TARGET_DIR/public/downloads/patrika-astro.apk"

echo "=========================================================="
echo "SUCCESS! Production Android APK successfully built & signed:"
ls -lh "$TARGET_DIR/downloads/patrika-astro.apk"
echo "=========================================================="
