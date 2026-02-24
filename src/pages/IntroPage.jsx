import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./IntroPage.module.css";
import { useTranslation } from 'react-i18next';

export default function IntroPage({ onStart }) {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    function clickHandler() {
        onStart?.();
        navigate("/capture");
    }

    function toggleLanguage() {
        const newLang = i18n.language === 'fa' ? 'en' : 'fa';
        i18n.changeLanguage(newLang);
    }

    const isEnglish = i18n.language === 'en';

    return (
        <div className={styles.header}>
            <div onClick={toggleLanguage} className={styles.changeLangBtnHeader}>
                <img className={styles.changeLangBtn} src="/02-Picture-Dialogue.png" alt="" />
                <h3> {i18n.language === 'fa' ? 'English' : 'Persian'} </h3>
            </div>

            <div className={styles.introTextWrap}>
                <img src="/01-Intro-Dialogue.png" alt="" className={styles.introText} />
                <p className={`${isEnglish ? styles.english : styles.persian}`}>
                    {t('intro.welcome.line1')}
                    <br />
                    {t('intro.welcome.line2')}
                </p>
            </div>
            <img src="/Image_2_copy.png" alt="" className={styles.lion} />

            <div className={`${styles.headerStartBtn} ${isEnglish ? styles.english : ''}`} onClick={clickHandler}>
                <h2 className={`${isEnglish ? styles.english : styles.persian}`}>{t('intro.start')}</h2>
            </div>
        </div>
    )
}
