import { ImageResponse } from "@vercel/og";
import React from "react";

/*
  The preview image for a shared link, drawn to look like the notebook the
  piece came from rather than a generic card.

  Written with React.createElement rather than JSX because this file is
  compiled as a plain edge function, with no JSX transform of its own.
*/

export const config = { runtime: "edge" };

const COVERS = {
  orange: { bg: "#f94b0c", ink: "#ffffff", muted: "rgba(255,255,255,0.72)" },
  paper: { bg: "#f2efe6", ink: "#2a2620", muted: "rgba(42,38,32,0.62)" },
  blue: { bg: "#dce6f4", ink: "#20406e", muted: "rgba(32,64,110,0.62)" },
  forest: { bg: "#2f5d43", ink: "#eef3ee", muted: "rgba(238,243,238,0.72)" },
  night: { bg: "#1c2233", ink: "#e7ecf7", muted: "rgba(231,236,247,0.72)" },
  crimson: { bg: "#a4243b", ink: "#f7ecdf", muted: "rgba(247,236,223,0.72)" },
  sand: { bg: "#dcc29a", ink: "#4a3820", muted: "rgba(74,56,32,0.62)" },
  mint: { bg: "#b9d6c6", ink: "#1f4038", muted: "rgba(31,64,56,0.62)" },
  slate: { bg: "#465260", ink: "#e8ecf2", muted: "rgba(232,236,242,0.72)" },
};

const el = React.createElement;

export default function handler(request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "Commonplace Book").slice(0, 120);
  const label = (searchParams.get("label") || "").slice(0, 60);
  const category = (searchParams.get("category") || "").slice(0, 40);
  const c = COVERS[searchParams.get("variant")] || COVERS.orange;

  return new ImageResponse(
    el(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: c.bg,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        },
      },
      el(
        "div",
        { style: { display: "flex", flexDirection: "column" } },
        el(
          "div",
          {
            style: {
              display: "flex",
              fontSize: 26,
              letterSpacing: 12,
              color: c.muted,
              textTransform: "uppercase",
            },
          },
          "Commonplace Book"
        ),
        category
          ? el(
              "div",
              {
                style: {
                  display: "flex",
                  marginTop: 14,
                  fontSize: 22,
                  letterSpacing: 6,
                  color: c.muted,
                  textTransform: "uppercase",
                },
              },
              category
            )
          : null
      ),
      el(
        "div",
        {
          style: {
            display: "flex",
            fontSize: title.length > 46 ? 62 : 86,
            lineHeight: 1.1,
            fontWeight: 800,
            color: c.ink,
          },
        },
        title
      ),
      el(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            letterSpacing: 4,
            color: c.muted,
            textTransform: "uppercase",
          },
        },
        el("div", { style: { display: "flex" } }, label || "Juan Maulana"),
        el("div", { style: { display: "flex" } }, "Written in Indonesia")
      )
    ),
    {
      width: 1200,
      height: 630,
      headers: { "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800" },
    }
  );
}
