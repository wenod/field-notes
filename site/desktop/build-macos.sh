#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_ROOT="$PROJECT_ROOT/.desktop-build"
RELEASE_ROOT="$PROJECT_ROOT/release"
APP_BUNDLE="$RELEASE_ROOT/Field Notes.app"
DMG_PATH="$RELEASE_ROOT/Field Notes.dmg"
CONTENTS="$APP_BUNDLE/Contents"
ICONSET="$BUILD_ROOT/AppIcon.iconset"
STAGING="$BUILD_ROOT/dmg"
XCODE_BETA="/Applications/Xcode-beta.app/Contents/Developer"

cd "$PROJECT_ROOT"
npm run build
node "$PROJECT_ROOT/desktop/prepare-desktop.mjs"

rm -rf "$BUILD_ROOT" "$APP_BUNDLE" "$DMG_PATH"
mkdir -p "$CONTENTS/MacOS" "$CONTENTS/Resources/WebApp" "$ICONSET" "$STAGING" "$BUILD_ROOT/ModuleCache"

if [[ -d "$XCODE_BETA" ]]; then
  export DEVELOPER_DIR="$XCODE_BETA"
fi

SWIFTC="$(xcrun --find swiftc)"
SDKROOT="$(xcrun --sdk macosx --show-sdk-path)"
ARCH="$(uname -m)"

/usr/bin/ditto "$PROJECT_ROOT/dist" "$CONTENTS/Resources/WebApp"
/usr/bin/ditto "$PROJECT_ROOT/desktop/Info.plist" "$CONTENTS/Info.plist"

"$SWIFTC" -O \
  -sdk "$SDKROOT" \
  -target "$ARCH-apple-macosx13.0" \
  -module-cache-path "$BUILD_ROOT/ModuleCache" \
  -framework AppKit \
  -framework WebKit \
  "$PROJECT_ROOT/desktop/FieldNotesApp.swift" \
  -o "$CONTENTS/MacOS/FieldNotes"

"$SWIFTC" -O \
  -sdk "$SDKROOT" \
  -target "$ARCH-apple-macosx13.0" \
  -module-cache-path "$BUILD_ROOT/ModuleCache" \
  -framework AppKit \
  "$PROJECT_ROOT/desktop/GenerateIcon.swift" \
  -o "$BUILD_ROOT/GenerateIcon"
"$BUILD_ROOT/GenerateIcon" "$BUILD_ROOT/AppIcon-1024.png"
/usr/bin/sips -z 16 16 "$BUILD_ROOT/AppIcon-1024.png" --out "$ICONSET/icon_16x16.png" >/dev/null
/usr/bin/sips -z 32 32 "$BUILD_ROOT/AppIcon-1024.png" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
/usr/bin/sips -z 32 32 "$BUILD_ROOT/AppIcon-1024.png" --out "$ICONSET/icon_32x32.png" >/dev/null
/usr/bin/sips -z 64 64 "$BUILD_ROOT/AppIcon-1024.png" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
/usr/bin/sips -z 128 128 "$BUILD_ROOT/AppIcon-1024.png" --out "$ICONSET/icon_128x128.png" >/dev/null
/usr/bin/sips -z 256 256 "$BUILD_ROOT/AppIcon-1024.png" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
/usr/bin/sips -z 256 256 "$BUILD_ROOT/AppIcon-1024.png" --out "$ICONSET/icon_256x256.png" >/dev/null
/usr/bin/sips -z 512 512 "$BUILD_ROOT/AppIcon-1024.png" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
/usr/bin/sips -z 512 512 "$BUILD_ROOT/AppIcon-1024.png" --out "$ICONSET/icon_512x512.png" >/dev/null
/usr/bin/ditto "$BUILD_ROOT/AppIcon-1024.png" "$ICONSET/icon_512x512@2x.png"
/usr/bin/iconutil -c icns "$ICONSET" -o "$CONTENTS/Resources/AppIcon.icns"

/usr/bin/codesign --force --deep --sign - "$APP_BUNDLE"
/usr/bin/ditto "$APP_BUNDLE" "$STAGING/Field Notes.app"
/bin/ln -s /Applications "$STAGING/Applications"
/usr/bin/hdiutil create \
  -volname "Field Notes" \
  -srcfolder "$STAGING" \
  -ov \
  -format UDZO \
  "$DMG_PATH" >/dev/null

printf 'Built %s\nBuilt %s\n' "$APP_BUNDLE" "$DMG_PATH"
