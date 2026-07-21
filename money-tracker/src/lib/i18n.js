import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Welcome": "Welcome",
      "Login": "Login",
      "Admin Dashboard": "Admin Dashboard",
      "User Dashboard": "User Dashboard",
      "Transactions": "Transactions",
      "Add Transaction": "Add Record",
      "Date": "Date",
      "Day": "Day",
      "Reason": "Reason",
      "Amount": "Amount",
      "Action": "Action",
      "Logout": "Logout",
      "Total Income": "Total Income",
      "Total Expense": "Total Expense",
      "Balance": "Balance",
      "Monthly Summary": "Monthly Summary",
      "Yearly Summary": "Yearly Summary",
      "Role Selection": "Role Selection",
      "Select your role": "Select your role to continue"
    }
  },
  hi: {
    translation: {
      "Welcome": "स्वागत हे",
      "Login": "लॉग इन करें",
      "Admin Dashboard": "व्यवस्थापक डैशबोर्ड",
      "User Dashboard": "उपयोगकर्ता डैशबोर्ड",
      "Transactions": "लेन-देन",
      "Add Transaction": "रिकॉर्ड जोड़ें",
      "Date": "तारीख",
      "Day": "दिन",
      "Reason": "कारण",
      "Amount": "रकम",
      "Action": "कार्रवाई",
      "Logout": "लॉग आउट",
      "Total Income": "कुल आय",
      "Total Expense": "कुल खर्च",
      "Balance": "शेष राशि",
      "Monthly Summary": "मासिक सारांश",
      "Yearly Summary": "वार्षिक सारांश",
      "Role Selection": "भूमिका चयन",
      "Select your role": "जारी रखने के लिए अपनी भूमिका चुनें"
    }
  },
  gu: {
    translation: {
      "Welcome": "સ્વાગત છે",
      "Login": "લૉગિન કરો",
      "Admin Dashboard": "એડમિન ડેશબોર્ડ",
      "User Dashboard": "વપરાશકર્તા ડેશબોર્ડ",
      "Transactions": "વ્યવહારો",
      "Add Transaction": "રેકોર્ડ ઉમેરો",
      "Date": "તારીખ",
      "Day": "દિવસ",
      "Reason": "કારણ",
      "Amount": "રકમ",
      "Action": "ક્રિયા",
      "Logout": "લૉગ આઉટ",
      "Total Income": "કુલ આવક",
      "Total Expense": "કુલ ખર્ચ",
      "Balance": "બેલેન્સ",
      "Monthly Summary": "માસિક સારાંશ",
      "Yearly Summary": "વાર્ષિક સારાંશ",
      "Role Selection": "ભૂમિકા પસંદગી",
      "Select your role": "આગળ વધવા માટે તમારી ભૂમિકા પસંદ કરો"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", 
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
