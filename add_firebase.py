#!/usr/bin/env python3
import os, re

vars_path = 'android/variables.gradle'
if os.path.exists(vars_path):
    txt = open(vars_path).read()
    txt = txt.replace('minSdkVersion = 22', 'minSdkVersion = 23')
    txt = txt.replace('minSdkVersion 22', 'minSdkVersion 23')
    open(vars_path, 'w').write(txt)
    print('variables.gradle gefixed')

app = 'android/app/build.gradle'
txt = open(app).read()

# Verwijder de Capacitor google-services conditionele check
# en vervang door directe apply
old_block = "def servicesJSON = file('google-services.json')\n    if (servicesJSON.exists()) {\n        apply plugin: 'com.google.gms.google-services'\n    } else {\n        logger.info(\"google-services.json not found, google-services plugin not applied. Push Notifications won't work\")\n    }"
new_block = "apply plugin: 'com.google.gms.google-services'"

if old_block in txt:
    txt = txt.replace(old_block, new_block)
    print('Capacitor conditie vervangen door directe plugin apply')
elif "google-services plugin not applied" in txt:
    # Alternatief patroon
    txt = re.sub(
        r"def servicesJSON[^\n]+\n\s+if \(servicesJSON\.exists\(\)\)[^}]+\}[^}]+\}",
        "apply plugin: 'com.google.gms.google-services'",
        txt
    )
    print('Alternatief patroon vervangen')

if 'firebase-messaging' not in txt:
    txt = txt.replace(
        'dependencies {',
        'dependencies {\n    implementation platform("com.google.firebase:firebase-bom:34.11.0")\n    implementation "com.google.firebase:firebase-messaging"',
        1
    )
    print('Firebase messaging toegevoegd')

open(app, 'w').write(txt)

proj = 'android/build.gradle'
if os.path.exists(proj):
    txt2 = open(proj).read()
    if 'google-services' not in txt2:
        txt2 = txt2.replace(
            'dependencies {',
            'dependencies {\n        classpath "com.google.gms:google-services:4.4.4"',
            1
        )
        open(proj, 'w').write(txt2)
        print('classpath toegevoegd')

print('=== Firebase in build.gradle ===')
for line in open(app):
    if 'firebase' in line.lower() or 'google-services' in line.lower():
        print(line.rstrip())
print('klaar')
