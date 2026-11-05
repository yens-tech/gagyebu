// ================================================================
//  우리 가계부 설정 파일 — 여기만 고치면 됩니다
// ================================================================
//  ① Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹) 에 나오는
//     firebaseConfig 값을 아래 firebase: { ... } 안에 그대로 붙여넣으세요.
//  ② 비워 두면(firebase: null) 이 기기에만 저장되는 모드로 동작합니다.
// ================================================================
window.APP_CONFIG = {
  firebase: {
    apiKey: "AIzaSyAYm1IUp4R0XSZjJWAttjLDKxZdzNsPnDs",
    authDomain: "our-gagyebu-82fa6.firebaseapp.com",
    projectId: "our-gagyebu-82fa6",
    storageBucket: "our-gagyebu-82fa6.firebasestorage.app",
    messagingSenderId: "791505003609",
    appId: "1:791505003609:web:4cebf7fc17932526b27d48"
  },
  // 예시:
  // firebase: {
  //   apiKey: "AIza....",
  //   authDomain: "our-gagyebu.firebaseapp.com",
  //   projectId: "our-gagyebu",
  //   storageBucket: "our-gagyebu.appspot.com",
  //   messagingSenderId: "1234567890",
  //   appId: "1:1234567890:web:abcd1234"
  // },
  householdId: "our-home"   // 두 사람이 같은 값을 쓰면 같은 가계부를 공유합니다
};
