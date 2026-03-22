# Run as a background service

How to keep local-llm-proxy running automatically.

## macOS (launchd)

Create `~/Library/LaunchAgents/com.local-llm-proxy.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.local-llm-proxy</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/usr/local/lib/node_modules/local-llm-proxy/dist/index.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/local-llm-proxy.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/local-llm-proxy.err.log</string>
</dict>
</plist>
```

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.local-llm-proxy.plist
```

Adjust the `node` and `index.js` paths to match your installation. Find them with:

```bash
which node
npm root -g
```

## Linux (systemd)

Create `~/.config/systemd/user/local-llm-proxy.service`:

```ini
[Unit]
Description=local-llm-proxy
After=network.target

[Service]
ExecStart=/usr/bin/node /usr/lib/node_modules/local-llm-proxy/dist/index.js
Restart=on-failure
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
```

Enable and start:

```bash
systemctl --user enable local-llm-proxy
systemctl --user start local-llm-proxy
```

## Checking status

Regardless of init system, verify with:

```bash
curl http://127.0.0.1:9099/health
```
