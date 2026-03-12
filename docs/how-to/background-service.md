# Run as a background service

How to keep claude-cli-proxy running automatically.

## macOS (launchd)

Create `~/Library/LaunchAgents/com.claude-cli-proxy.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claude-cli-proxy</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/usr/local/lib/node_modules/claude-cli-proxy/dist/index.js</string>
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
  <string>/tmp/claude-cli-proxy.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/claude-cli-proxy.err.log</string>
</dict>
</plist>
```

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.claude-cli-proxy.plist
```

Adjust the `node` and `index.js` paths to match your installation. Find them with:

```bash
which node
npm root -g
```

## Linux (systemd)

Create `~/.config/systemd/user/claude-cli-proxy.service`:

```ini
[Unit]
Description=claude-cli-proxy
After=network.target

[Service]
ExecStart=/usr/bin/node /usr/lib/node_modules/claude-cli-proxy/dist/index.js
Restart=on-failure
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
```

Enable and start:

```bash
systemctl --user enable claude-cli-proxy
systemctl --user start claude-cli-proxy
```

## Checking status

Regardless of init system, verify with:

```bash
curl http://127.0.0.1:9099/health
```
