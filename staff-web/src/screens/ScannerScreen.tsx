import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { staffAPI, ScanResult } from '../api/client';
import '../styles/Scanner.css';

export default function ScannerScreen() {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    setError('');
    setResult(null);
    setScanning(true);

    try {
      const codeReader = new BrowserMultiFormatReader();
      readerRef.current = codeReader;

      const videoInputDevices = await codeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        throw new Error(t('scanner.noCamera'));
      }

      const selectedDeviceId = videoInputDevices[0].deviceId;

      codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current!,
        async (result, err) => {
          if (result) {
            const text = result.getText();
            const tokenMatch = text.match(/token=([^&]+)/);
            if (tokenMatch) {
              const token = tokenMatch[1];
              await handleScan(token);
              stopScanning();
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error('Decode error:', err);
          }
        }
      );
    } catch (err: any) {
      setError(err.message || t('scanner.failedToStart'));
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (token: string) => {
    setProcessing(true);
    setError('');
    try {
      const scanResult = await staffAPI.scan(token);
      setResult(scanResult);
    } catch (err: any) {
      setError(err.message || t('scanner.scanFailed'));
    } finally {
      setProcessing(false);
    }
  };

  const handleManualEntry = () => {
    const token = prompt(t('scanner.enterToken'));
    if (token) {
      handleScan(token);
    }
  };

  const handleConsume = async () => {
    if (!result || !result.pass) return;

    setProcessing(true);
    try {
      const token = new URLSearchParams(window.location.search).get('token') || '';
      await staffAPI.consume(token, 1);
      alert(t('scanner.entryConsumed'));
      setResult(null);
    } catch (err: any) {
      setError(err.message || t('scanner.failedToConsume'));
    } finally {
      setProcessing(false);
    }
  };

  const getStatusClass = () => {
    if (!result) return '';
    return result.valid ? 'status-valid' : 'status-invalid';
  };

  const getStatusText = () => {
    if (!result) return '';
    if (result.valid) return t('scanner.valid');
    return result.reason || t('scanner.invalid');
  };

  return (
    <div className="scanner-container">
      <div className="scanner-header">
        <h1>{t('scanner.title')}</h1>
        <div className="nav-buttons">
          <button onClick={() => window.location.href = '/dashboard'} className="nav-button">
            {t('dashboard.title')}
          </button>
          <button onClick={() => window.location.href = '/users'} className="nav-button">
            {t('dashboard.viewUsers')}
          </button>
          <button onClick={() => window.location.href = '/create-pass'} className="nav-button">
            {t('dashboard.createPass')}
          </button>
          <button onClick={() => window.location.href = '/history'} className="nav-button">
            {t('dashboard.viewHistory')}
          </button>
        </div>
      </div>

      <div className="scanner-content">
        <div className="camera-section">
          {!scanning ? (
            <div className="camera-placeholder">
              <button onClick={startScanning} className="start-button">
                {t('scanner.startCamera')}
              </button>
              <button onClick={handleManualEntry} className="manual-button">
                {t('scanner.manualEntry')}
              </button>
            </div>
          ) : (
            <div className="camera-active">
              <video ref={videoRef} className="camera-video" />
              <button onClick={stopScanning} className="stop-button">
                {t('scanner.stopCamera')}
              </button>
            </div>
          )}
        </div>

        {processing && (
          <div className="processing">{t('common.processing')}</div>
        )}

        {error && (
          <div className="error-box">{error}</div>
        )}

        {result && (
          <div className={`result-panel ${getStatusClass()}`}>
            <div className="status-badge">
              <h2>{getStatusText()}</h2>
            </div>

            {result.valid && result.pass && (
              <div className="pass-details">
                <h3>{t('scanner.memberInfo')}</h3>
                <div className="detail-row">
                  <span className="label">{t('scanner.name')}:</span>
                  <span className="value">{result.pass.user.name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">{t('scanner.email')}:</span>
                  <span className="value">{result.pass.user.email}</span>
                </div>

                <h3>{t('scanner.passInfo')}</h3>
                <div className="detail-row">
                  <span className="label">{t('scanner.type')}:</span>
                  <span className="value">{result.pass.type.name}</span>
                </div>
                {result.pass.validUntil && (
                  <div className="detail-row">
                    <span className="label">{t('scanner.validUntil')}:</span>
                    <span className="value">
                      {new Date(result.pass.validUntil).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {result.pass.remainingEntries !== null && (
                  <div className="detail-row">
                    <span className="label">{t('scanner.remainingEntries')}:</span>
                    <span className="value">{result.pass.remainingEntries}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">{t('scanner.status')}:</span>
                  <span className="value">{result.pass.status}</span>
                </div>

                {result.autoConsumed && (
                  <div className="auto-consumed-notice">
                    {t('scanner.autoConsumed')}
                  </div>
                )}

                <button onClick={() => setResult(null)} className="done-button">
                  {t('common.done')}
                </button>
              </div>
            )}

            {!result.valid && (
              <div className="invalid-reason">
                <p>{t('scanner.cannotBeUsed')}</p>
                <p className="reason-text">{result.reason}</p>
                <button onClick={() => setResult(null)} className="done-button">
                  {t('common.done')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
