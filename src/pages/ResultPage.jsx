import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ResultPage.module.css";
import { useTranslation } from "react-i18next";
import { postJson } from "../lib/api";

export default function ResultPage({ generationData, onResetFlow }) {
  const [showMessage, setShowMessage] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const isEnglish = i18n.language === "en";

  useEffect(() => {
    if (!generationData?.imageUrl) {
      navigate("/capture", { replace: true });
    }
  }, [generationData, navigate]);

  const downloadImage = async (url) => {
    const response = await fetch(url, { mode: "cors" });

    if (!response.ok) {
      throw new Error(isEnglish ? "Download failed." : "دانلود ناموفق بود.");
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "my-painting.jpg";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  const handleRegisterAndDownload = async () => {
    if (!generationData?.generationId) {
      return;
    }

    const phone = window.prompt(
      isEnglish
        ? "Enter your phone number to receive QR code"
        : "برای دریافت QR شماره تلفن را وارد کنید",
      "",
    );

    if (!phone) {
      return;
    }

    setIsRegistering(true);
    setShowMessage(isEnglish ? "Saving your number..." : "در حال ثبت شماره...");

    try {
      const registerResult = await postJson("/api/register", {
        generationId: generationData.generationId,
        phone,
      });

      if (registerResult?.qrCodeDataUrl) {
        setQrCodeDataUrl(registerResult.qrCodeDataUrl);
      }

      try {
        await downloadImage(generationData.imageUrl);
      } catch {
        // QR flow must still continue even if download fails.
      }

      setShowMessage(isEnglish ? "Done! Scan this QR code." : "انجام شد! QR کد را اسکن کنید.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("result.error");
      setQrCodeDataUrl("");
      setShowMessage(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  function toggleLanguage() {
    const newLang = i18n.language === "fa" ? "en" : "fa";
    i18n.changeLanguage(newLang);
  }

  function restartHandler() {
    onResetFlow?.();
    navigate("/");
  }

  return (
    <div className={`${styles.header} ${isEnglish ? styles.english : ""}`}>
      <div onClick={toggleLanguage} className={styles.changeLangBtnHeader}>
        <img className={styles.changeLangBtn} src="/02-Picture-Dialogue.png" alt="" />
        <h3>{i18n.language === "fa" ? "English" : "Persian"}</h3>
      </div>

      <div className={styles.secondHeader}>
        <div className={styles.neonFrame}>
          <img src="/04-Result-Frame.png" alt="" />
          <div
            className={styles.resultImg}
            style={{ backgroundImage: `url(${generationData?.imageUrl || ""})` }}
          >
            {(showMessage || qrCodeDataUrl || isRegistering) && (
              <div className={styles.messageHeader}>
                <div>
                  <h1>{showMessage}</h1>
                  {qrCodeDataUrl ? (
                    <img className={styles.qrImage} src={qrCodeDataUrl} alt="QR Code" />
                  ) : (
                    <h2>{isRegistering ? (isEnglish ? "Please wait..." : "لطفا صبر کنید...") : generationData?.generationId?.slice(-8)}</h2>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`${styles.btnHeader} ${showMessage && styles.bigRestartBtn}`}>
          {!qrCodeDataUrl && (
            <div className={styles.downloadBtn} onClick={handleRegisterAndDownload}>
              <img src="/04-Result-Left-CTA.png" alt="" />
              <h1>{t("result.download")}</h1>
            </div>
          )}
          <div className={styles.reStartBtn} onClick={restartHandler}>
            <img src="/04-Result-Right-CTA.png" alt="" />
            <h1>
              {t("result.restart.line1")} <br /> {t("result.restart.line2")}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}

