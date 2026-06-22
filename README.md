# EEG 2026 - Focus Game

## EEG 連線疑難排解 (EEG Connection Troubleshooting)

本遊戲使用 Python Bridge 與 NeuroSky EEG 裝置進行通訊。若您遇到連線問題，請參考以下步驟：

### 支援裝置
*   **NeuroSky MindWave Mobile 2** (推薦) - 支援直接 BLE 連線，無需配對 (macOS/Windows)。
*   **NeuroSky MindWave Mobile** (舊版) - 需傳統藍牙配對。
*   任何相容於 ThinkGear Connector (TGC) 或提供 Serial Port 輸出的 NeuroSky 相容裝置。

### 常見問題：無法連接 MindWave Mobile 2
若您在執行程式時看到 `Device refused connection` 或 `Connection Failed`，通常是因為 **電腦作業系統已經佔用了藍牙連線**。

**解決方法：**
1.  打開電腦的 **系統設定 (System Settings)** -> **藍牙 (Bluetooth)**。
2.  找到 "MindWave Mobile"。
3.  點擊 **中斷連線 (Disconnect)** 或 **忘記此裝置 (Forget This Device)**。
    *   **注意**：Python 程式 (Bleak) 會直接掃描並連接裝置，**不需要** 在系統設定中先配對。如果系統已經連上，程式反而會連不進去。
4.  重新執行遊戲或 Python Bridge。

### 診斷工具
若仍有問題，請執行以下指令進行診斷：
```bash
# 1. 確保虛擬環境已建立 (若無，請執行 python3 -m venv .venv && .venv/bin/pip install bleak websockets)
# 2. 執行診斷腳本
.venv/bin/python3 deep_diagnose.py
```
如果診斷腳本顯示 `Connected: True` 且 `Found Target`，則代表硬體連線正常。
接下來請執行 Bridge 程式：
```bash
.venv/bin/python3 eeg_bridge.py
```
若顯示 `STATUS HEARTBEAT` 但 Signal Quality 為 0%，請檢查是否已正確佩戴耳機 (傳感器需接觸前額，耳夾需夾緊耳垂)。

### 系統需求
*   **Windows**: Windows 10 或以上 (需支援 Bluetooth 4.0 LE 或 Classic)
*   **macOS**: macOS 10.13 High Sierra 或以上
*   **Python**: 3.8 或以上 (執行 `eeg_bridge.py` 需安裝 `bleak` 或 `pyserial` 依賴)

### 藍牙配對與連線步驟

1.  **開啟裝置電源**：
    *   將 MindWave 耳機開關撥至 `On` 位置。
    *   確認藍燈快閃（配對模式）或慢閃（已配對/待機）。

2.  **系統藍牙配對** (首次使用)：
    *   **Windows**: 設定 > 裝置 > 藍牙 > 新增藍牙裝置 > 選擇 "MindWave Mobile"。
    *   **macOS**: 系統偏好設定 > 藍牙 > 連線 "MindWave Mobile"。
    *   *注意：若使用 BLE 模式 (Mobile 2)，部分系統無需手動配對，Python 腳本可直接掃描連接。*

3.  **啟動 EEG Bridge**：
    *   在終端機執行：
        ```bash
        python eeg_bridge.py
        ```
    *   確認看到 `WebSocket server started on ws://localhost:8765` 訊息。
    *   Bridge 會自動搜尋並連接 EEG 裝置。

4.  **遊戲連線**：
    *   開啟遊戲網頁 (`index.html` 或 Local Server)。
    *   點擊右上角 "Connect EEG Bridge" (連接腦波儀)。
    *   若連線成功，按鈕將顯示綠色 "EEG Connected"。

### 常見問題與錯誤排除

*   **錯誤：Device Not Found / 偵測不到裝置**
    *   確認耳機電量充足（紅燈表示低電量）。
    *   確認藍牙已開啟且未被其他應用程式（如手機 App）佔用。
    *   嘗試重啟耳機與 Python Bridge。

*   **錯誤：Signal Poor / 訊號品質不佳**
    *   確認前額感測器（金屬接點）緊貼皮膚。
    *   確認耳夾感測器已夾好耳垂。
    *   保持靜止，避免劇烈搖頭。
    *   等待數秒讓訊號穩定（Signal Quality 應大於 0）。

*   **沒有 EEG 裝置，如何體驗遊戲？**
    *   當連線失敗彈出視窗時，點擊 **「體驗模式 (Simulation)」** 按鈕。
    *   系統將會產生模擬的腦波數據，讓您體驗船隻速度變化。
    *   *注意：一旦真實 EEG 裝置連接成功，體驗模式將自動關閉。*

*   **連線一直失敗，如何進行開發測試？**
    *   當重試超過 5 次後，重試按鈕會變為 **「手動設定 (Manual Mode)」**。
    *   點擊後可開啟除錯面板，手動拉動滑桿模擬專注度數值，以測試遊戲功能。

## Unit Tests
To run unit tests:
1. Open `tests/test_runner.html` in your browser (via a local server).
2. Check the on-screen log for PASS/FAIL results covering:
   - Device connection failures
   - Signal interruption
   - Attention to Speed mapping
   - Virtual data blocking
