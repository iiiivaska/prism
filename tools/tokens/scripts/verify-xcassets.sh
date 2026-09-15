#!/usr/bin/env bash
# Compiles the generated color catalog (swift/Sources/DSTokens/Resources/Colors.xcassets) with actool for iOS,
# macOS and watchOS, fails on any actool warning or error, and checks `assetutil --info` of each compiled
# catalog (ARCHITECTURE §9.8, ADR-0020 rule 11): every colorset compiles on every platform, and in every
# namespace folder <namespace>/color-text-secondary compiles to
#   iOS      the four universal appearances Any, UIAppearanceDark, UIAppearanceHighContrastAny and
#            UIAppearanceHighContrastDark;
#   macOS    Any, NSAppearanceNameDarkAqua, NSAppearanceNameAccessibilitySystem and
#            NSAppearanceNameAccessibilityDarkAqua;
#   watchOS  exactly one entry, the `watch` idiom entry, because actool keeps no appearances for watchOS.
#
# macOS only (the apple CI job). Usage: bash tools/tokens/scripts/verify-xcassets.sh
# ACTOOL and ASSETUTIL override the tools (default: `xcrun actool`, `xcrun assetutil`); VERIFY_XCASSETS_PROBE the
# colorset checked in every namespace (default: color-text-secondary).
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd -P)"
catalog="$root/swift/Sources/DSTokens/Resources/Colors.xcassets"
probe="${VERIFY_XCASSETS_PROBE:-color-text-secondary}"
# Package.swift: platforms [.iOS(.v26), .macOS(.v26), .watchOS(.v26)].
minimum_os="26.0"
read -r -a actool <<< "${ACTOOL:-xcrun actool}"
read -r -a assetutil <<< "${ASSETUTIL:-xcrun assetutil}"
work=""

fail() {
  echo "verify-xcassets: $*" >&2
  exit 1
}

# The color entries of a compiled catalog, one "name|appearance|idiom" line each. Any has no appearance, and
# a macOS catalog names no idiom, which counts as universal. assetutil prints pretty JSON: one object per
# rendition, its keys on lines of their own.
entries() {
  "${assetutil[@]}" --info "$1" | awk '
    function value(line) { sub(/^[^:]*: "/, "", line); sub(/",?[[:space:]]*$/, "", line); gsub(/\\\//, "/", line); return line }
    /^  \{/ { type = ""; name = ""; appearance = ""; idiom = ""; next }
    /^    "AssetType" : "/ { type = value($0) }
    /^    "Name" : "/ { name = value($0) }
    /^    "Appearance" : "/ { appearance = value($0) }
    /^    "Idiom" : "/ { idiom = value($0) }
    /^  \}/ { if (type == "Color") print name "|" appearance "|" (idiom == "" ? "universal" : idiom) }
  '
}

# The appearances of one name, sorted, "idiom:appearance" joined by spaces.
appearances_of() {
  awk -F'|' -v name="$2" '$1 == name { print $3 ":" $2 }' "$1" | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//'
}

compile() { # compile <platform> <out-dir> <target-device>...
  local platform="$1" out="$2"
  shift 2
  local devices=()
  local device
  for device in "$@"; do devices+=(--target-device "$device"); done
  mkdir -p "$out"
  if ! "${actool[@]}" "$catalog" --compile "$out" --platform "$platform" "${devices[@]}" \
    --minimum-deployment-target "$minimum_os" --output-format human-readable-text --notices --warnings --errors \
    --output-partial-info-plist "$out/partial-info.plist" > "$out/actool.log" 2>&1; then
    cat "$out/actool.log" >&2
    fail "actool failed for $platform"
  fi
  if grep -Eq 'com\.apple\.actool\.[a-z.]*(warnings|errors)|: (warning|error):' "$out/actool.log"; then
    cat "$out/actool.log" >&2
    fail "actool reported warnings or errors for $platform"
  fi
  [ -f "$out/Assets.car" ] || fail "actool wrote no Assets.car for $platform"
}

main() {
  [ -d "$catalog" ] || fail "$catalog does not exist; run pnpm tokens:build"
  local namespaces=()
  local dir
  for dir in "$catalog"/*/; do
    dir="${dir%/}"
    if [ -f "$dir/Contents.json" ] && grep -q '"provides-namespace" : true' "$dir/Contents.json"; then
      namespaces+=("$(basename "$dir")")
    fi
  done
  [ "${#namespaces[@]}" -gt 0 ] || fail "no namespace folder (provides-namespace) in $catalog"
  local colorsets
  colorsets="$(find "$catalog" -name '*.colorset' -type d | wc -l | tr -d ' ')"

  work="$(mktemp -d "${TMPDIR:-/tmp}/verify-xcassets.XXXXXX")"
  trap 'rm -rf "${work:-}"' EXIT

  local platform expected
  for platform in iphoneos macosx watchos; do
    case "$platform" in
      iphoneos)
        compile iphoneos "$work/$platform" iphone ipad
        expected="universal: universal:UIAppearanceDark universal:UIAppearanceHighContrastAny universal:UIAppearanceHighContrastDark"
        ;;
      macosx)
        compile macosx "$work/$platform" mac
        expected="universal: universal:NSAppearanceNameAccessibilityDarkAqua universal:NSAppearanceNameAccessibilitySystem universal:NSAppearanceNameDarkAqua"
        ;;
      watchos)
        compile watchos "$work/$platform" watch
        expected="watch:"
        ;;
    esac
    entries "$work/$platform/Assets.car" > "$work/$platform.entries"
    local compiled
    compiled="$(cut -d'|' -f1 "$work/$platform.entries" | LC_ALL=C sort -u | wc -l | tr -d ' ')"
    [ "$compiled" = "$colorsets" ] || fail "$platform: $compiled of $colorsets colorsets compiled"
    local ns got
    for ns in "${namespaces[@]}"; do
      got="$(appearances_of "$work/$platform.entries" "$ns/$probe")"
      [ "$got" = "$expected" ] || fail "$platform: $ns/$probe compiled to [$got], expected [$expected]"
    done
    echo "verify-xcassets: $platform: $compiled colorsets compiled; $probe as expected in ${namespaces[*]}"
  done
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; fi
