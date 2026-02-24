import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./TakingPicture.module.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

export default function TakingPicture({ onStartGeneration, generationStatus, generationError }) {
    const [status, setStatus] = useState(false);
    const [photo, setPhoto] = useState(null);
    const [facingMode, setFacingMode] = useState("environment");
    const [cameraError, setCameraError] = useState("");
    const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const isEnglish = i18n.language === 'en';
    const isGenerating = generationStatus === "running";

    const stopCameraStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                track.stop();
            });
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async (requestedFacingMode) => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError(isEnglish ? "Camera is not supported on this device." : "دوربین روی این دستگاه پشتیبانی نمی‌شود.");
            return;
        }

        setIsSwitchingCamera(true);
        setCameraError("");
        stopCameraStream();

        try {
            let stream;

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: requestedFacingMode } },
                    audio: false,
                });
            } catch (firstError) {
                console.warn("Requested camera failed, fallback to default camera.", firstError);
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
            }

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => undefined);
            }
        } catch (error) {
            console.error("Camera start failed:", error);
            setCameraError(isEnglish ? "Unable to access camera. Please check camera permission." : "دسترسی به دوربین امکان‌پذیر نیست. مجوز دوربین را بررسی کنید.");
        } finally {
            setIsSwitchingCamera(false);
        }
    }, [isEnglish, stopCameraStream]);

    useEffect(() => {
        startCamera(facingMode);

        return () => {
            stopCameraStream();
        };
    }, [facingMode, startCamera, stopCameraStream]);

    function clickOnTakeBtn() {
        setStatus(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataURL = canvas.toDataURL("image/jpeg", 0.9);
        setPhoto(dataURL);
    }

    async function clickHandler() {
        if (!photo || !onStartGeneration || isGenerating) {
            return;
        }

        const generationPromise = onStartGeneration(photo);
        navigate("/loading");

        try {
            await generationPromise;
        } catch {
            // Loading page reads generation status from App state and shows errors.
        }
    }

    function switchCameraHandler() {
        if (status || isGenerating || isSwitchingCamera) {
            return;
        }

        setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    }

    function retakeHandler() {
        setStatus(false);
        setPhoto(null);
        setCameraError("");
        startCamera(facingMode);
    }

    function toggleLanguage() {
        const newLang = i18n.language === 'fa' ? 'en' : 'fa';
        i18n.changeLanguage(newLang);
    }

    return (
        <div className={`${styles.header} ${isEnglish ? styles.english : ''}`}>
            <div onClick={toggleLanguage} className={styles.changeLangBtnHeader}>
                <img className={styles.changeLangBtn} src="/02-Picture-Dialogue.png" alt="" />
                <h3> {i18n.language === 'fa' ? 'English' : 'Persian'} </h3>
            </div>

            <div className={styles.captureWrap}>
                <img src="/02-Picture-Frame.png" className={styles.takingFrame} alt="" />
                <div className={styles.cameraViewport}>
                    {!status && (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className={styles.cameraSection}
                        ></video>
                    )}

                    {status && (
                        <img src={photo} alt="" className={styles.cameraSection} />
                    )}
                </div>
            </div>

            {!status && (
                <button
                    type="button"
                    className={styles.switchCameraBtn}
                    onClick={switchCameraHandler}
                    disabled={isSwitchingCamera || isGenerating}
                >
                    {isSwitchingCamera
                        ? (isEnglish ? "Connecting..." : "در حال اتصال...")
                        : (facingMode === "environment"
                            ? (isEnglish ? "Back Camera" : "دوربین پشت")
                            : (isEnglish ? "Front Camera" : "دوربین جلو"))}
                </button>
            )}

            {cameraError && <p className={styles.cameraError}>{cameraError}</p>}
            {generationStatus === "error" && generationError && (
                <p className={styles.requestError}>{generationError}</p>
            )}

            {!status && (
                <div className={styles.takingBtn} onClick={clickOnTakeBtn}>
                    <h2>{`${t('capture.instruction.line1')}`} {<br></br>} {`${t('capture.instruction.line2')}`}</h2>
                    <img src="/02-Picture-Dialogue.png" className={styles.takingText} alt="" />
                </div>
            )}

            <canvas ref={canvasRef} style={{ display: "none" }} />

            {status && (
                <section className={styles.actions}>
                    <div
                        className={`${styles.generateBtn} ${isGenerating ? styles.disabledBtn : ""}`}
                        onClick={clickHandler}
                    >
                        <img src="/04-Result-Left-CTA.png" alt="" />
                        <h2>{isGenerating ? (isEnglish ? "Generating..." : "در حال تولید...") : t('capture.next')}</h2>
                    </div>
                    <div className={styles.ratakeBtn} onClick={retakeHandler}>
                        <img src="/04-Result-Right-CTA.png" alt="" />
                        <h2>{t('capture.retake')}</h2>
                    </div>
                </section>
            )}
        </div>
    )
}
