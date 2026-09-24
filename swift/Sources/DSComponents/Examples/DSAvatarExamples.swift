#if DEBUG
import SwiftUI
import DSCore
import DSTokens

/// `spec/components/Avatar.yaml` `examples`, in spec order.
///
/// **Written as data, because this harness never reads the spec**, as Badge's and IconButton's are: each example is
/// one `DSAvatarExample` row — its props with the spec's defaults filled in, whether its `image` is the `portrait`
/// fixture, and where it is staged — and `DSAvatarBindingTests.everyExampleIsTheOneTheSpecWrites` holds every row to
/// the spec's own entry, so a row cannot draw another avatar, or publish another name, than the web story generated from
/// the same entry.
///
/// **The stage is Badge's and IconButton's, in all four harnesses** (the Apple and web galleries and showcases): there
/// is no card-sized frame, because a 40 pt circle in a card-sized frame is a picture of the frame. A page example puts
/// the avatar straight on the page. `ringed-over-map` and `initials-over-map` put it straight on the synthetic map,
/// which the stage declares with `dsBackdrop(_:_:)`, so the circle reads the page over a map and renders the glass chip
/// (ADR-0036 §8.7); `on-glass-over-image` puts it inside a glass Surface over the synthetic image, with `radius: card`
/// and the default `padding: card`, which hugs it.
///
/// **The portrait** is spec/SCHEMA.md's `portrait` fixture, `DSExamplePortrait`, drawn from tokens in the colours of the
/// example's own context, as the web's harness draws it (`web/apps/gallery/src/harness/portrait.ts`), so no photograph
/// of anyone is in the gallery and a pair shows the same picture.
///
/// Every example with a name that is not decorative is one image named by that name; `fallback-icon` and `decorative`
/// are hidden. The names are `DSAvatarNameCase.all` (`DSAvatarBindingTests.swift`), the web's table in
/// `web/apps/gallery/test/accessibility.browser.test.tsx`, and what `DSAvatarAccessibilityTreeTests` reads off the
/// simulator. The names are the spec's own invented ones (ADR-0015 rule 3). Avatar declares no action prop, so no
/// example carries a handler (spec/SCHEMA.md, "Examples and snapshots").
enum DSAvatarExamples {
    static let rows: [DSAvatarExample] = [
        DSAvatarExample("image-md", name: "Anna Petrova", portrait: true, size: .md),
        DSAvatarExample("initials-md", name: "Anna Petrova", size: .md),
        DSAvatarExample("initials-one-word", name: "Northgate", size: .md),
        DSAvatarExample("fallback-icon", size: .md),
        DSAvatarExample("ringed", name: "Anna Petrova", portrait: true, hasRing: true),
        DSAvatarExample("size-sm", name: "Anna Petrova", size: .sm),
        DSAvatarExample("size-lg", name: "Anna Petrova", portrait: true, size: .lg),
        DSAvatarExample("decorative", name: "Anna Petrova", portrait: true, isDecorative: true),
        DSAvatarExample("ringed-over-map", name: "Anna Petrova", portrait: true, hasRing: true, staging: .ground(.map)),
        DSAvatarExample("initials-over-map", name: "Anna Petrova", size: .md, staging: .ground(.map)),
        DSAvatarExample(
            "on-glass-over-image", name: "Anna Petrova", hasRing: true, staging: .surface(.glass, backdrop: .image)
        ),
        DSAvatarExample("russian-initials", name: "Анна Петрова", size: .md),
    ]

    static var all: [DSExample] { rows.map(\.example) }
}

/// Where an Avatar example is staged: straight on a ground — the page, or the synthetic map or image, which the stage
/// declares, so the circle reads the page over that kind — or inside a Surface of a material, which declares the
/// backdrop it sits on, over the ground that paints that backdrop. The example's `surface` word is one or the other
/// (spec/component.schema.json, `examples[].surface`).
enum DSAvatarExampleStaging: Hashable {
    case ground(DSExampleGround)
    case surface(DSSurfaceMaterial, backdrop: DSBackdropKind)
}

/// One `examples[]` entry of Avatar.yaml: the props, with the spec's defaults where the entry writes none, and where
/// the avatar is staged.
struct DSAvatarExample: Hashable {
    let id: String
    /// The spec's string, byte for byte.
    let name: String?
    /// Whether `image` is the `portrait` fixture; an example writes no other image (spec/SCHEMA.md).
    let hasPortrait: Bool
    let size: DSAvatarSize
    let hasRing: Bool
    let isDecorative: Bool
    let staging: DSAvatarExampleStaging

    init(
        _ id: String,
        name: String? = nil,
        portrait: Bool = false,
        size: DSAvatarSize = .md,
        hasRing: Bool = false,
        isDecorative: Bool = false,
        staging: DSAvatarExampleStaging = .ground(.page)
    ) {
        self.id = id
        self.name = name
        self.hasPortrait = portrait
        self.size = size
        self.hasRing = hasRing
        self.isDecorative = isDecorative
        self.staging = staging
    }

    /// The context the circle reads where it is staged: the page over the ground's kind, or the Surface's material
    /// over the backdrop it declares.
    var context: DSSurfaceContext {
        switch staging {
        case .ground(.page): .root
        case .ground(.map): DSSurfaceContext(material: .page, backdrop: .map)
        case .ground(.image): DSSurfaceContext(material: .page, backdrop: .image)
        case .surface(let material, let backdrop): DSSurfaceContext(material: material, backdrop: backdrop)
        }
    }

    /// Whether the example renders glass, and so is also snapshotted under forced Reduce Transparency: its Surface is
    /// glass, or the circle's own `root.background` on its ground binds `material.glass.chip`. That is
    /// `ringed-over-map`, `initials-over-map` and `on-glass-over-image`.
    var hasGlass: Bool {
        if case .surface(let material, _) = staging, material.isGlass { return true }
        return DSAvatarAppearance.background(on: context) == .glass
    }

    var example: DSExample {
        DSExample("Avatar", id, hasGlass: hasGlass) { DSAvatarExampleStage(row: self) }
    }

    /// What the whole stage is painted on: the ground itself, or the backdrop a glass Surface blurs.
    var ground: DSExampleGround {
        switch staging {
        case .ground(let ground): ground
        case .surface(_, backdrop: .map): .map
        case .surface(_, backdrop: .image): .image
        case .surface: .page
        }
    }
}

/// One Avatar example on its stage.
struct DSAvatarExampleStage: View {
    let row: DSAvatarExample

    var body: some View {
        DSExampleStage(row.ground) {
            if case .surface(let material, let backdrop) = row.staging {
                DSSurfaceView(material: material, radius: .card, backdrop: backdrop) { DSAvatarExampleAvatar(row: row) }
            } else {
                DSAvatarExampleAvatar(row: row)
            }
        }
    }
}

/// An example's avatar: its props, and the `portrait` fixture drawn in the colours of the context it renders in.
struct DSAvatarExampleAvatar: View {
    let row: DSAvatarExample
    private var ds = DSThemeValues()
    /// The context the portrait's colours are resolved in: the scheme and contrast the example renders in.
    @Environment(\.self) private var environment

    // Written out: a private stored property makes the synthesized memberwise initializer private.
    init(row: DSAvatarExample) {
        self.row = row
    }

    var body: some View {
        DSAvatar(
            name: row.name,
            image: row.hasPortrait ? DSExamplePortrait.image(ds.tokens, in: environment) : nil,
            size: row.size,
            hasRing: row.hasRing,
            isDecorative: row.isDecorative
        )
    }
}

#Preview("Avatar · image-md") { DSExamplePreview(example: DSExamples.named("Avatar/image-md")) }
#Preview("Avatar · initials-md") { DSExamplePreview(example: DSExamples.named("Avatar/initials-md")) }
#Preview("Avatar · initials-one-word") { DSExamplePreview(example: DSExamples.named("Avatar/initials-one-word")) }
#Preview("Avatar · fallback-icon") { DSExamplePreview(example: DSExamples.named("Avatar/fallback-icon")) }
#Preview("Avatar · ringed") { DSExamplePreview(example: DSExamples.named("Avatar/ringed")) }
#Preview("Avatar · size-sm") { DSExamplePreview(example: DSExamples.named("Avatar/size-sm")) }
#Preview("Avatar · size-lg") { DSExamplePreview(example: DSExamples.named("Avatar/size-lg")) }
#Preview("Avatar · decorative") { DSExamplePreview(example: DSExamples.named("Avatar/decorative")) }
#Preview("Avatar · ringed-over-map") { DSExamplePreview(example: DSExamples.named("Avatar/ringed-over-map")) }
#Preview("Avatar · initials-over-map") { DSExamplePreview(example: DSExamples.named("Avatar/initials-over-map")) }
#Preview("Avatar · on-glass-over-image") { DSExamplePreview(example: DSExamples.named("Avatar/on-glass-over-image")) }
#Preview("Avatar · russian-initials") { DSExamplePreview(example: DSExamples.named("Avatar/russian-initials")) }

#Preview("Avatar · initials-over-map under Reduce Transparency: the raised fallback, the default cells") {
    DSExamplePreview(example: DSExamples.named("Avatar/initials-over-map"))
        .dsAccessibilityPolicy(reduceTransparency: true)
}

#Preview("Avatar · on every material") {
    DSTheme {
        DSExampleStage {
            VStack(alignment: .leading, spacing: DSExampleSize.gap) {
                DSExampleAvatarRow()
                DSSurfaceView(material: .raised, radius: .card) { DSExampleAvatarRow() }
                DSSurfaceView(material: .vivid, radius: .card) { DSExampleAvatarRow() }
                DSSurfaceView(material: .accent, radius: .card) { DSExampleAvatarRow() }
                DSSurfaceView(material: .inverse, radius: .card) { DSExampleAvatarRow() }
                DSSurfaceView(material: .glass, radius: .card, backdrop: .image) { DSExampleAvatarRow() }
                    .dsBackdrop(.image) { DSExampleImage() }
            }
        }
    }
}

#Preview("Avatar · sizes in every density") {
    DSTheme {
        DSExampleStage {
            VStack(alignment: .leading, spacing: DSExampleSize.gap) {
                ForEach([DSDensity.compact, .regular, .comfortable], id: \.self) { density in
                    HStack(spacing: DSExampleSize.gap) {
                        ForEach(DSAvatarSize.allCases, id: \.self) { size in
                            DSAvatar(name: "Anna Petrova", size: size)
                        }
                    }
                    .dsDensity(density)
                }
            }
        }
    }
}

#Preview("Avatar · an image arrives and fades in over the initials") {
    DSTheme {
        DSExampleStage { DSExampleAvatarLoading() }
    }
}

/// The initials, the glyph and a ringed initials circle: the three things an avatar draws without an image.
struct DSExampleAvatarRow: View {
    init() {}

    var body: some View {
        HStack(spacing: DSExampleSize.gap) {
            DSAvatar(name: "Anna Petrova")
            DSAvatar()
            DSAvatar(name: "Northgate", hasRing: true)
        }
    }
}

/// An avatar whose portrait arrives a second after it appears and leaves a second later, so the fade over the
/// initials — and, under Reduce Motion, its shorter form — can be watched in the canvas.
private struct DSExampleAvatarLoading: View {
    private var ds = DSThemeValues()
    @Environment(\.self) private var environment

    init() {}

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let loaded = Int(context.date.timeIntervalSinceReferenceDate) % 2 == 1
            DSAvatar(name: "Anna Petrova", image: loaded ? DSExamplePortrait.image(ds.tokens, in: environment) : nil, size: .lg)
        }
    }
}
#endif
