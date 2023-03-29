import en from "./locales/en";
import zhCN from "./locales/zh_CN";


const lang = window.localStorage.getItem('language');

const localeMap: { [k: string]: Partial<typeof en> } = {
    en,
    zh: zhCN,
};
const userLocale = localeMap[lang || 'en'];

export default function t(str: keyof typeof en, ...inserts: string[]): string {
    let localeStr = (userLocale && userLocale[str]) ?? en[str];

    for (let i = 0; i < inserts.length; i++) {
        localeStr = localeStr.replace(`%${i + 1}`, inserts[i]);
    }

    return localeStr;
}
