import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  fa: {
    translation: {
      intro: {
        welcome: {
          line1: "خوش اومدی دوست من، نقاشیت آماده‌ست؟",
          line2: "دکمه شروع رو لمس کنی، میریم مرحله ی بعد",
        },
        start: "شروع",
      },
      capture: {
        instruction: {
          line1: "اینجارو لمس کن",
          line2: "تا از نقاشیت عکس بگیرم",
        },
        next: "بریم مرحله بعد",
        retake: "دوباره عکس بگیریم؟",
      },
      loading: {
        initial: "خب بذار منم نقاشیم تموم شه :)",
        msg1: "هنوز تموم نشده!",
        msg2: "یه خورده دیگه وایسا!",
        msg3: "داره تموم میشه",
        msg4: "یه جاهایی‌ش مونده",
        msg5: "آخراشه",
        msg6: "الان بهت نشونش میدم",
        complete: "نقاشیمون آماده‌ست.",
      },
      result: {
        download: "نقاشیمون رو توی گوشیت ذخیره کن",
        restart: {
          line1: "یه نقاشی دیگه",
          line2: "بکشیم؟",
        },
        success: "هورااا، ذخیره شد",
        error: "دانلود ناموفق بود، از اول تلاش کنید.",
      },
    },
  },
  en: {
    translation: {
      intro: {
        welcome: {
          line1: "Welcome my friend, is your painting ready?",
          line2: "Touch the start button, let's go to the next",
        },
        start: "Start",
      },
      capture: {
        instruction: {
          line1: "Touch here",
          line2: "to take a photo of your painting",
        },
        next: "Go to next step",
        retake: "Take photo again?",
      },
      loading: {
        initial: "Let me finish my painting :)",
        msg1: "Not done yet!",
        msg2: "Wait a little more!",
        msg3: "Almost done",
        msg4: "A few touches left",
        msg5: "So close",
        msg6: "Showing you now",
        complete: "Our painting is ready.",
      },
      result: {
        download: "Save our painting on your phone",
        restart: {
          line1: "Shall we draw",
          line2: "another?",
        },
        success: "Hurray, saved!",
        error: "Download failed, please try again.",
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "fa",
  fallbackLng: "fa",
  interpolation: { escapeValue: false },
});

export default i18n;
