#!/usr/bin/env python3
import os

# Fix minSdk naar 23
vars_path = 'android/variables.gradle'
if os.path.exists(vars_path):
    txt = open(vars_path).read()
    txt = txt.replace('minSdkVersion = 22', 'minSdkVersion = 23')
    txt = txt.replace('minSdkVersion 22', 'minSdkVersion 23')
    open(vars_path, 'w').write(txt)
    print('minSdk gefixed naar 23')

# Voeg WorkManager toe aan dependencies
app = 'android/app/build.gradle'
txt = open(app).read()

if 'work-runtime' not in txt:
    txt = txt.replace(
        'dependencies {',
        'dependencies {\n    implementation "androidx.work:work-runtime:2.9.0"',
        1
    )
    print('WorkManager dependency toegevoegd')
    open(app, 'w').write(txt)

print('=== Dependencies ===')
for line in open(app):
    if 'work-runtime' in line:
        print(line.rstrip())
print('klaar')
