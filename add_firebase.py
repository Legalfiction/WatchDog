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

# Verwijder de Capacitor google-services check zodat de plugin altijd wordt toegepast
if "servicesJSON = file('google-services.json')" in txt:
    # Vervang de conditionele apply door een directe apply
    txt = re.sub(
        r"def servicesJSON.*?logger\.info\([^)]+\)\s*\}",
        "apply plugin: 'com.google.gms.google-services'",
        txt,
        flags=re.DOTALL
    )
    print('Capacitor google-services conditie verwijderd, plugin direct toegepast')

if 'com.google.gms.google-services' not in txt:
    txt = txt.replace(
        'id "com.android.application"',
        'id "com.android.application"\n    id "com.google.gms.google-services"'
    )
    print('google-services plugin toegevoegd')

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
