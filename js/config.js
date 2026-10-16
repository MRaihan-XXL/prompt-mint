// DepthGlow runtime config — ALL values here are public by design (browser-side).
// Server secrets (service role, PayPal secret, webhook id) live in CF Pages env vars.
window.DG = {
  SUPABASE_URL: "https://cuvclcicqzgewfsbqdnw.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_NYHDwz3hF7pilEGuxJkTDg_G4lfwD2W",

  // LIVE client id (Default App). Sandbox id for e2e testing:
  //   sandbox: BAAARmgTjzjIeaPDSl2KXm3FtQF_wgZyjy9Y2j7EVuWJ0tayyuCa8gfphywci8W440PKdpmPsldUc2X-Bs
  PAYPAL_CLIENT_ID: "BAA6Xl6SI-h9CapMfALGvAv7moGbPQ2kfQ7Qz0mA-KFD-LHcyoF5eavPcQa5Lg95JFdrJ3SdRiF1UyO6NI",

  // Where auth sends the user back to (this exact page):
  REDIRECT: location.origin + location.pathname
};
