// Reads the report from the link fragment and offers the phone's share sheet (DESIGN.md §7.7b).
// Format 1: #1.<base64url(deflate-raw(UTF-8 report))>, written by ShareLink.kt. Nothing leaves the phone
// except what the user shares.
"use strict";

const FORMAT_VERSION = "1";

function fromBase64Url(text) {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new TextDecoder("utf-8", { fatal: true }).decode(await new Response(stream).arrayBuffer());
}

/** The report, or a message saying why there is none. */
async function readReport(fragment) {
  const dot = fragment.indexOf(".");
  if (!fragment || dot < 0) return { error: "QR을 다시 찍어 주세요." };
  if (fragment.slice(0, dot) !== FORMAT_VERSION) return { error: "TV 앱을 업데이트해 주세요." };
  if (typeof DecompressionStream === "undefined") {
    return { error: "이 브라우저에서는 열 수 없습니다. 휴대폰의 기본 브라우저를 최신으로 업데이트해 주세요." };
  }
  try {
    return { report: await inflateRaw(fromBase64Url(fragment.slice(dot + 1))) };
  } catch (e) {
    return { error: "QR을 다시 찍어 주세요." };
  }
}

function show(id, visible) {
  document.getElementById(id).hidden = !visible;
}

function say(text) {
  document.getElementById("status").textContent = text;
}

async function main() {
  const { report, error } = await readReport(location.hash.slice(1));
  const message = document.getElementById("message");
  if (error) {
    message.textContent = error;
    return;
  }
  message.textContent = "아래 [공유하기]를 눌러 카카오톡 등으로 보내세요.";
  document.getElementById("report").textContent = report; // text only, never parsed as HTML
  show("report", true);
  show("actions", true);

  if (navigator.share) {
    show("share", true);
    document.getElementById("share").addEventListener("click", async () => {
      try {
        await navigator.share({ text: report });
      } catch (e) {
        if (e.name !== "AbortError") say("공유하지 못했습니다. [복사]를 눌러 붙여 넣어 주세요.");
      }
    });
  } else {
    message.textContent = "[복사]를 누른 뒤 카카오톡 등에 붙여 넣어 보내세요.";
  }
  document.getElementById("copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(report);
      say("복사했습니다. 카카오톡 등에 붙여 넣으세요.");
    } catch (e) {
      say("복사하지 못했습니다. 위 글을 길게 눌러 선택해 복사해 주세요.");
    }
  });
}

main();
