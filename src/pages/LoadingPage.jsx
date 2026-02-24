import React, { useEffect, useState } from "react";
import styles from "./LoadingPage.module.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function LoadingPage({ generationData, generationStatus, generationError }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const TOTAL_DURATION_MS = 120000;
  const MESSAGE_STEP_MS = 20000;

  const isEnglish = i18n.language === "en";
  const isPersian = i18n.language === "fa";

  const getLabelText = () => {
    if (generationStatus === "error") {
      return (
        generationError ||
        (isEnglish
          ? "Generation failed. Please try again."
          : "تولید تصویر ناموفق بود. دوباره تلاش کنید.")
      );
    }

    if (generationStatus === "success" && generationData) {
      return t("loading.complete");
    }

    const loadingMessages = [
      "loading.initial",
      "loading.msg1",
      "loading.msg2",
      "loading.msg3",
      "loading.msg4",
      "loading.msg5",
      "loading.msg6",
    ];

    const index = Math.min(
      loadingMessages.length - 1,
      Math.floor(elapsedMs / MESSAGE_STEP_MS),
    );

    return t(loadingMessages[index]);
  };

  useEffect(() => {
    if (generationStatus === "idle") {
      const timeoutId = setTimeout(() => {
        navigate("/capture", { replace: true });
      }, 900);

      return () => clearTimeout(timeoutId);
    }

    return undefined;
  }, [generationStatus, navigate]);

  useEffect(() => {
    if (generationStatus === "running") {
      const startAt = Date.now();
      const intervalId = setInterval(() => {
        setElapsedMs(Date.now() - startAt);
      }, 1000);

      return () => clearInterval(intervalId);
    }

    if (generationStatus === "success" && generationData) {
      const timeoutId = setTimeout(() => {
        navigate("/result");
      }, 700);

      return () => clearTimeout(timeoutId);
    }

    if (generationStatus === "error") {
      const timeoutId = setTimeout(() => {
        navigate("/capture");
      }, 2600);

      return () => clearTimeout(timeoutId);
    }

    return undefined;
  }, [generationData, generationStatus, navigate]);

  const toPersianNumber = (num) => {
    if (isEnglish) return num.toString();
    return num.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  };

  const timedPercent = Math.min(
    100,
    Math.max(1, Math.round((elapsedMs / TOTAL_DURATION_MS) * 100)),
  );

  const shownPercent =
    generationStatus === "success" || generationStatus === "error" ? 100 : timedPercent;

  return (
    <div
      className={`${styles.header} ${isEnglish ? styles.english : ""}`}
      dir={isPersian ? "rtl" : "ltr"}
    >
      <div className={styles.stage}>
        <div className={styles.loaderWrap}>
          <video className={styles.video} src="/Loading.webm" autoPlay loop muted playsInline />
          <h2 className={`${styles.percent} ${isEnglish ? styles.english : styles.persian}`}>
            {toPersianNumber(shownPercent)}%
          </h2>
        </div>

        <div className={styles.labelWrap}>
          <img className={styles.textBox} src="/01-Intro-Dialogue.png" alt="" />
          <h1 className={`${styles.labelText} ${isEnglish ? styles.english : styles.persian}`}>
            {getLabelText()}
          </h1>
        </div>

        <img className={styles.miraxImg} src="/miraxForLoading.png" alt="" />
      </div>
    </div>
  );
}
