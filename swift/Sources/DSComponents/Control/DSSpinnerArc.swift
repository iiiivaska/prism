import SwiftUI
import DSCore
import DSTokens

/// The spinner a loading Button shows in place of its label (Button.yaml anatomy `spinner`).
///
/// It is not `Spinner.yaml`, which no stack implements yet; it draws that spec's arc the way a control's spinner part
/// is drawn:
///  - the 270° open sweep with round caps at `comp.spinner.stroke`, no track, inside a square box — here the label's
///    height, as Button.yaml and Spinner.yaml both say;
///  - one clockwise revolution per `motion.duration.slower` with `motion.easing.linear`;
///  - under Reduce Motion the rotation is an ambient loop and does not run (Spinner.yaml `reduceMotion: instant`): the
///    complete circumference holds at `opacity.dimmed-row`;
///  - the colour is the owning control's binding, passed in.
///
/// Spinner.yaml's `delay` is not applied inside a Button: the label is replaced the moment `isLoading` turns on, so a
/// held-back spinner would leave an empty pill for `motion.duration.slower`. The spinner appears with the swap.
struct DSSpinnerArc: View {
    let color: Color
    private var ds = DSThemeValues()
    @State private var turning = false

    init(color: Color) {
        self.color = color
    }

    var body: some View {
        let tokens = ds.tokens
        let motion = ds.motion
        let runs = motion.runsDecorativeAnimations(.instant)
        let stroke = tokens.components.spinner.stroke
        Circle()
            .inset(by: stroke / 2)
            .trim(from: 0, to: runs ? DSSpinnerGeometry.sweep : 1)
            .stroke(color, style: StrokeStyle(lineWidth: stroke, lineCap: .round))
            .opacity(runs ? 1 : tokens.opacity.dimmedRow)
            .rotationEffect(runs && turning ? DSSpinnerGeometry.turn : .zero)
            .animation(
                runs ? motion.animation(motion.tokens.easingLinear, duration: motion.tokens.durationSlower).repeatForever(autoreverses: false) : nil,
                value: turning
            )
            .aspectRatio(1, contentMode: .fit)
            .onAppear { turning = true }
            .accessibilityHidden(true)
    }
}

/// The arc's geometry, stated in words by Spinner.yaml.
nonisolated enum DSSpinnerGeometry {
    /// The open sweep: 270° of the circumference.
    static let sweep: CGFloat = 0.75
    /// One revolution.
    static let turn: Angle = .degrees(360)
}
