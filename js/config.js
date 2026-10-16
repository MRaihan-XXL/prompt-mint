// DepthGlow runtime config — ALL values here are public by design (browser-side).
// Server secrets (service role, PayPal secret, webhook id) live in CF Pages env vars.
window.DG = {
  SUPABASE_URL: "https://cuvclciqzgzevwsbqdnw.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dmNsY2ljcXpnZXdmc2JxZG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNDE2MDEsImV4cCI6MjEwNzcxNzYwMX0.5AqRycUaWwZqkT8nyv52va6zPXK7iydNeId25Ufw7LQ",

  // SANDBOX client id for e2e testing (swap back to the LIVE id before prod):
  //   live: BAA6Xl6SI-h9CapMfALGvAv7moGbPQ2kfQ7Qz0mA-KFD-LHcyoF5eavPcQa5Lg95JFdrJ3SdRiF1UyO6NI
  PAYPAL_CLIENT_ID: "BAAARmgTjzjIeaPDSl2KXm3FtQF_wgZyjy9Y2j7EVuWJ0tayyuCa8gfphywci8W440PKdpmPsldUc2X-Bs",

  // Where auth sends the user back to (this exact page):
  REDIRECT: location.origin + location.pathname
};
