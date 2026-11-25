import { continueRender, delayRender, staticFile } from "remotion";

// Self-hosted variable fonts (copied from @fontsource-variable) so renders never depend on the network.
const handle = delayRender("Loading fonts");
const faces = [
  new FontFace("Manrope", `url(${staticFile("fonts/manrope.woff2")}) format("woff2")`, { weight: "200 800" }),
  new FontFace("Inter", `url(${staticFile("fonts/inter.woff2")}) format("woff2")`, { weight: "100 900" }),
];
Promise.all(faces.map((f) => f.load()))
  .then((loaded) => { loaded.forEach((f) => document.fonts.add(f)); continueRender(handle); })
  .catch((err) => { console.error(err); continueRender(handle); });
