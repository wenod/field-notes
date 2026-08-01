import AppKit

guard CommandLine.arguments.count == 2 else {
    fputs("Usage: GenerateIcon.swift output.png\n", stderr)
    exit(2)
}

let canvas = NSSize(width: 1024, height: 1024)
let image = NSImage(size: canvas)
image.lockFocus()

let outer = NSBezierPath(roundedRect: NSRect(x: 42, y: 42, width: 940, height: 940), xRadius: 220, yRadius: 220)
let background = NSGradient(colors: [
    NSColor(calibratedRed: 0.035, green: 0.063, blue: 0.12, alpha: 1),
    NSColor(calibratedRed: 0.055, green: 0.12, blue: 0.22, alpha: 1)
])!
background.draw(in: outer, angle: -55)

NSGraphicsContext.current?.saveGraphicsState()
let shadow = NSShadow()
shadow.shadowColor = NSColor(calibratedWhite: 0, alpha: 0.42)
shadow.shadowBlurRadius = 38
shadow.shadowOffset = NSSize(width: 0, height: -18)
shadow.set()

func tile(_ rect: NSRect, radius: CGFloat, color: NSColor) {
    color.setFill()
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}

tile(NSRect(x: 220, y: 500, width: 320, height: 320), radius: 74, color: NSColor(calibratedRed: 0.16, green: 0.61, blue: 1, alpha: 1))
tile(NSRect(x: 604, y: 604, width: 200, height: 216), radius: 60, color: NSColor(calibratedRed: 0.08, green: 0.40, blue: 0.91, alpha: 1))
tile(NSRect(x: 220, y: 204, width: 200, height: 216), radius: 60, color: NSColor(calibratedRed: 0.08, green: 0.40, blue: 0.91, alpha: 1))
tile(NSRect(x: 500, y: 204, width: 304, height: 320), radius: 74, color: NSColor(calibratedRed: 0.39, green: 0.79, blue: 1, alpha: 1))
NSGraphicsContext.current?.restoreGraphicsState()

let highlight = NSGradient(colors: [NSColor(calibratedWhite: 1, alpha: 0.14), NSColor(calibratedWhite: 1, alpha: 0)])!
highlight.draw(in: NSBezierPath(roundedRect: NSRect(x: 78, y: 492, width: 868, height: 452), xRadius: 172, yRadius: 172), angle: -90)

image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Could not render the application icon.\n", stderr)
    exit(1)
}

try png.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
