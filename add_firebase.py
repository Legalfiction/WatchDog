name: Build Barkr APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Build Vite app
        run: npm run build

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Add Android platform
        run: npx cap add android

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Fix minSdk in variables.gradle
        run: |
          echo "=== variables.gradle voor fix ==="
          cat android/variables.gradle || echo "niet gevonden"
          # Vervang minSdkVersion in variables.gradle
          sed -i "s/minSdkVersion = 22/minSdkVersion = 23/" android/variables.gradle
          sed -i "s/minSdkVersion=22/minSdkVersion=23/" android/variables.gradle  
          sed -i "s/'minSdkVersion', '22'/'minSdkVersion', '23'/" android/variables.gradle
          echo "=== variables.gradle na fix ==="
          cat android/variables.gradle

      - name: Inject native Android bestanden
        run: |
          mkdir -p android/app/src/main/java/nl/barkr/app
          cp BarkrService.java       android/app/src/main/java/nl/barkr/app/BarkrService.java
          cp BootReceiver.java       android/app/src/main/java/nl/barkr/app/BootReceiver.java
          cp MainActivity.java       android/app/src/main/java/nl/barkr/app/MainActivity.java
          cp BarkrFcmService.java    android/app/src/main/java/nl/barkr/app/BarkrFcmService.java
          cp AndroidManifest.xml     android/app/src/main/AndroidManifest.xml
          cp google-services.json    android/app/google-services.json
          echo "✅ Native bestanden geïnjecteerd"

      - name: Installeer ImageMagick
        run: sudo apt-get install -y imagemagick

      - name: Genereer iconen
        run: |
          if [ -f "img/logo1.jpg" ]; then
            LOGO="img/logo1.jpg"
          elif [ -f "logoApp.png" ]; then
            LOGO="logoApp.png"
          elif [ -f "logo.png" ]; then
            LOGO="logo.png"
          else
            echo "❌ FOUT: geen logo gevonden!"
            exit 1
          fi

          for DENSITY in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
            case $DENSITY in
              mdpi)    SIZE=48  ;;
              hdpi)    SIZE=72  ;;
              xhdpi)   SIZE=96  ;;
              xxhdpi)  SIZE=144 ;;
              xxxhdpi) SIZE=192 ;;
            esac
            DIR="android/app/src/main/res/mipmap-${DENSITY}"
            mkdir -p "$DIR"
            convert "$LOGO" -resize ${SIZE}x${SIZE} "$DIR/ic_launcher.png"
            convert "$LOGO" -resize ${SIZE}x${SIZE} "$DIR/ic_launcher_round.png"
            if [ -f "$DIR/ic_launcher_foreground.png" ]; then
              convert "$LOGO" -resize ${SIZE}x${SIZE} "$DIR/ic_launcher_foreground.png"
            fi
          done

          rm -f android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
          rm -f android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
          echo "✅ Iconen gegenereerd"

      - name: Genereer keystore voor signing
        run: |
          keytool -genkey -v \
            -keystore android/app/barkr-release.jks \
            -keyalg RSA \
            -keysize 2048 \
            -validity 10000 \
            -alias ${{ secrets.KEY_ALIAS }} \
            -storepass ${{ secrets.KEYSTORE_PASSWORD }} \
            -keypass ${{ secrets.KEY_PASSWORD }} \
            -dname "CN=Barkr, OU=Barkr, O=Barkr, L=Netherlands, ST=Netherlands, C=NL"

      - name: Verhoog minSdk naar 23
        run: |
          echo "=== Voor fix ==="
          grep -r "minSdk" android/ --include="*.gradle" --include="*.kts" --include="*.properties" || true
          # Fix in alle gradle bestanden inclusief variables.gradle
          find android/ -type f \( -name "*.gradle" -o -name "*.kts" -o -name "variables.gradle" \) -exec sed -i "s/minSdkVersion 22/minSdkVersion 23/g" {} \;
          find android/ -type f \( -name "*.gradle" -o -name "*.kts" -o -name "variables.gradle" \) -exec sed -i "s/minSdk = 22/minSdk = 23/g" {} \;
          find android/ -type f \( -name "*.gradle" -o -name "*.kts" -o -name "variables.gradle" \) -exec sed -i "s/minSdkVersion=22/minSdkVersion=23/g" {} \;
          find android/ -type f \( -name "*.gradle" -o -name "*.kts" -o -name "variables.gradle" \) -exec sed -i 's/minSdk 22/minSdk 23/g' {} \;
          echo "=== Na fix ==="
          grep -r "minSdk" android/ --include="*.gradle" --include="*.kts" --include="*.properties" || true

      - name: Voeg Firebase toe aan project build.gradle
        run: python3 add_firebase.py

      - name: Configureer signing in build.gradle
        run: |
          cat >> android/app/build.gradle << 'EOF'

          android.signingConfigs {
              release {
                  storeFile file("barkr-release.jks")
                  storePassword System.getenv("KEYSTORE_PASSWORD")
                  keyAlias System.getenv("KEY_ALIAS")
                  keyPassword System.getenv("KEY_PASSWORD")
              }
          }
          android.buildTypes.release.signingConfig = android.signingConfigs.release
          android.buildTypes.debug.signingConfig = android.signingConfigs.release
          EOF

      - name: Make gradlew executable
        run: chmod +x android/gradlew

      - name: Build signed APK
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          cd android
          ./gradlew assembleDebug

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: barkr-signed-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 30
