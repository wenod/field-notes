import AppKit
import Darwin
import WebKit

private let localScheme = "field-notes"

private final class LocalContentSchemeHandler: NSObject, WKURLSchemeHandler {
    private let rootURL: URL

    init(rootURL: URL) {
        self.rootURL = rootURL.standardizedFileURL
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url,
              requestURL.scheme == localScheme,
              requestURL.host == "app" else {
            fail(urlSchemeTask, message: "Invalid local URL")
            return
        }

        let relativePath = requestURL.path == "/" ? "index.html" : String(requestURL.path.dropFirst())
        let fileURL = rootURL.appendingPathComponent(relativePath).standardizedFileURL
        let allowedRoot = rootURL.path.hasSuffix("/") ? rootURL.path : rootURL.path + "/"

        guard fileURL.path.hasPrefix(allowedRoot), !relativePath.contains("..") else {
            fail(urlSchemeTask, message: "Path is outside the application bundle")
            return
        }

        do {
            let data = try Data(contentsOf: fileURL, options: [.mappedIfSafe])
            let response = URLResponse(
                url: requestURL,
                mimeType: Self.mimeType(for: fileURL.pathExtension),
                expectedContentLength: data.count,
                textEncodingName: Self.isText(fileURL.pathExtension) ? "utf-8" : nil
            )
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            urlSchemeTask.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func fail(_ task: WKURLSchemeTask, message: String) {
        task.didFailWithError(NSError(
            domain: "FieldNotes.LocalContent",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: message]
        ))
    }

    private static func isText(_ extensionName: String) -> Bool {
        ["html", "css", "js", "mjs", "json", "svg", "txt", "map"].contains(extensionName.lowercased())
    }

    private static func mimeType(for extensionName: String) -> String {
        switch extensionName.lowercased() {
        case "html": return "text/html"
        case "css": return "text/css"
        case "js", "mjs": return "text/javascript"
        case "json", "map": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif": return "image/gif"
        case "webp": return "image/webp"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        default: return "application/octet-stream"
        }
    }
}

private final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    private var window: NSWindow?
    private var webView: WKWebView?
    private var schemeHandler: LocalContentSchemeHandler?
    private let smokeTest = CommandLine.arguments.contains("--smoke-test")
    private var smokeTestAttempts = 0

    func applicationDidFinishLaunching(_ notification: Notification) {
        guard let webRoot = Bundle.main.resourceURL?.appendingPathComponent("WebApp", isDirectory: true) else {
            terminateWithError("The bundled dashboard could not be found.")
            return
        }

        let configuration = WKWebViewConfiguration()
        let handler = LocalContentSchemeHandler(rootURL: webRoot)
        schemeHandler = handler
        configuration.setURLSchemeHandler(handler, forURLScheme: localScheme)
        configuration.websiteDataStore = .nonPersistent()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        self.webView = webView
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsMagnification = true
        webView.setValue(false, forKey: "drawsBackground")

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1440, height: 900),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        self.window = window
        window.title = "Field Notes"
        window.minSize = NSSize(width: 960, height: 640)
        window.contentView = webView
        window.center()
        window.isReleasedWhenClosed = false
        window.titlebarAppearsTransparent = false
        window.makeKeyAndOrderFront(nil)

        NSApp.activate(ignoringOtherApps: true)
        webView.load(URLRequest(url: URL(string: "\(localScheme)://app/index.html")!))
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag { window?.makeKeyAndOrderFront(nil) }
        return true
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        if url.scheme == localScheme {
            decisionHandler(.allow)
        } else if ["http", "https", "mailto"].contains(url.scheme?.lowercased() ?? "") {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
        } else {
            decisionHandler(.cancel)
        }
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url, url.scheme != localScheme {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if smokeTest { pollForLoadedDashboard() }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if smokeTest { terminateWithError(error.localizedDescription) }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if smokeTest { terminateWithError(error.localizedDescription) }
    }

    @objc func reloadDashboard(_ sender: Any?) {
        webView?.reload()
    }

    @objc func showAbout(_ sender: Any?) {
        NSApp.orderFrontStandardAboutPanel(options: [
            .applicationName: "Field Notes",
            .applicationVersion: "1.0.0",
            .credits: NSAttributedString(string: "A private, local technical bookmark library.")
        ])
    }

    private func pollForLoadedDashboard() {
        smokeTestAttempts += 1
        let probe = "({ text: document.body.innerText, records: window.__FIELD_NOTES_DATA__?.records?.length ?? 0 })"
        webView?.evaluateJavaScript(probe) { [weak self] result, error in
            guard let self else { return }
            let payload = result as? [String: Any]
            let text = payload?["text"] as? String ?? ""
            let recordCount = (payload?["records"] as? NSNumber)?.intValue ?? 0
            if text.contains("BOOKMARK LIBRARY"), text.contains("Local index"), recordCount > 6_000 {
                print("SMOKE_TEST_OK: dashboard and \(recordCount) local bookmark records loaded")
                fflush(stdout)
                exit(EXIT_SUCCESS)
            }
            if text.contains("Index unavailable") {
                self.terminateWithError("The dashboard loaded, but its bookmark index did not.")
                return
            }
            if self.smokeTestAttempts >= 80 {
                self.terminateWithError(error?.localizedDescription ?? "Dashboard load timed out.")
                return
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                self.pollForLoadedDashboard()
            }
        }
    }

    private func terminateWithError(_ message: String) {
        fputs("SMOKE_TEST_FAILED: \(message)\n", stderr)
        fflush(stderr)
        exit(EXIT_FAILURE)
    }
}

private func makeMainMenu(delegate: AppDelegate) -> NSMenu {
    let mainMenu = NSMenu()

    let appMenuItem = NSMenuItem()
    mainMenu.addItem(appMenuItem)
    let appMenu = NSMenu()
    appMenu.addItem(NSMenuItem(title: "About Field Notes", action: #selector(AppDelegate.showAbout(_:)), keyEquivalent: ""))
    appMenu.items.last?.target = delegate
    appMenu.addItem(.separator())
    appMenu.addItem(NSMenuItem(title: "Hide Field Notes", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h"))
    appMenu.addItem(NSMenuItem(title: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h"))
    appMenu.items.last?.keyEquivalentModifierMask = [.command, .option]
    appMenu.addItem(NSMenuItem(title: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: ""))
    appMenu.addItem(.separator())
    appMenu.addItem(NSMenuItem(title: "Quit Field Notes", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
    appMenuItem.submenu = appMenu

    let editMenuItem = NSMenuItem()
    mainMenu.addItem(editMenuItem)
    let editMenu = NSMenu(title: "Edit")
    editMenu.addItem(NSMenuItem(title: "Undo", action: Selector(("undo:")), keyEquivalent: "z"))
    editMenu.addItem(NSMenuItem(title: "Redo", action: Selector(("redo:")), keyEquivalent: "Z"))
    editMenu.addItem(.separator())
    editMenu.addItem(NSMenuItem(title: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x"))
    editMenu.addItem(NSMenuItem(title: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c"))
    editMenu.addItem(NSMenuItem(title: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v"))
    editMenu.addItem(NSMenuItem(title: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a"))
    editMenuItem.submenu = editMenu

    let viewMenuItem = NSMenuItem()
    mainMenu.addItem(viewMenuItem)
    let viewMenu = NSMenu(title: "View")
    let reloadItem = NSMenuItem(title: "Reload Dashboard", action: #selector(AppDelegate.reloadDashboard(_:)), keyEquivalent: "r")
    reloadItem.target = delegate
    viewMenu.addItem(reloadItem)
    viewMenuItem.submenu = viewMenu

    let windowMenuItem = NSMenuItem()
    mainMenu.addItem(windowMenuItem)
    let windowMenu = NSMenu(title: "Window")
    windowMenu.addItem(NSMenuItem(title: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m"))
    windowMenu.addItem(NSMenuItem(title: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: ""))
    windowMenuItem.submenu = windowMenu
    NSApp.windowsMenu = windowMenu

    return mainMenu
}

let application = NSApplication.shared
private let delegate = AppDelegate()
application.setActivationPolicy(.regular)
application.delegate = delegate
application.mainMenu = makeMainMenu(delegate: delegate)
application.run()
