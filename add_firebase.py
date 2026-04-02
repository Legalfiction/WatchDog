#!/usr/bin/env python3
import os

# Fix minSdk
vars_path = 'android/variables.gradle'
if os.path.exists(vars_path):
    txt = open(vars_path).read()
    txt = txt.replace('minSdkVersion = 22', 'minSdkVersion = 23')
    txt = txt.replace('minSdkVersion 22', 'minSdkVersion 23')
    open(vars_path, 'w').write(txt)
    print('variables.gradle gefixed')

app = 'android/app/build.gradle'
txt = open(app).read()

# Voeg WorkManager dependency toe - gegarandeerd werkend op alle Android telefoons
if 'work-runtime' not in txt:
    txt = txt.replace(
        'dependencies {',
        'dependencies {\n    implementation "androidx.work:work-runtime:2.9.0"',
        1
    )
    print('WorkManager dependency toegevoegd')

open(app, 'w').write(txt)
print('=== Dependencies in build.gradle ===')
for line in open(app):
    if 'work-runtime' in line or 'firebase' in line.lower():
        print(line.rstrip())
print('klaar')
