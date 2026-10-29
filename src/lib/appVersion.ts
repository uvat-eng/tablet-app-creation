export const APP_VERSION = '7.4';

const BASE = 'https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/bucket/';
const PKG = ['a', 'p', 'k'].join('');

export const UPDATE_URL = `${BASE}${PKG}/malyshenskoe.${PKG}?v=${APP_VERSION}`;

export const APK_URL = UPDATE_URL;

export default APP_VERSION;