#!/bin/bash
# Build SCORM 1.2 package for LMS upload (e.g. HowNow)
# Output: scorm-package.zip
#
# Run from the project root:  bash build-scorm.sh

set -e

DIST="scorm-dist"
OUT="scorm-package.zip"

echo "Building SCORM package..."

# Clean previous build
rm -rf "$DIST" "$OUT"

# Create directory structure
mkdir -p "$DIST/lessons" "$DIST/quiz" "$DIST/calculator" "$DIST/js" "$DIST/css"

# Copy SCORM manifest and launcher
cp imsmanifest.xml "$DIST/"
cp scorm-launcher.html "$DIST/"

# Copy course content
cp index.html "$DIST/"
cp js/main.js "$DIST/js/"
cp js/scorm-wrapper.js "$DIST/js/"
cp css/style.css "$DIST/css/"
cp lessons/*.html "$DIST/lessons/"
cp quiz/*.html "$DIST/quiz/"
cp calculator/*.html "$DIST/calculator/"

# Create zip (PowerShell on Windows, zip on Unix)
if command -v zip &> /dev/null; then
  cd "$DIST" && zip -r "../$OUT" . && cd ..
else
  powershell.exe -Command "Compress-Archive -Path '${DIST}\\*' -DestinationPath '${OUT}' -Force"
fi

# Clean up temp directory
rm -rf "$DIST"

echo "Done! Upload '$OUT' to HowNow as a SCORM 1.2 package."
