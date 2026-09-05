import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Capture an HTML element as high-resolution Canvas (2x scale for crisp prints).
 * Handles hidden elements (e.g. `hidden print:block`) automatically by rendering an offscreen clone.
 */
export async function captureElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const isHidden = window.getComputedStyle(element).display === "none";
  let renderEl = element;
  let clone: HTMLElement | null = null;

  if (isHidden) {
    clone = element.cloneNode(true) as HTMLElement;
    clone.style.display = "block";
    clone.style.position = "fixed";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    clone.style.width = "800px";
    clone.style.zIndex = "-9999";
    clone.style.backgroundColor = "#ffffff";
    clone.classList.remove("hidden");
    clone.classList.add("block");
    document.body.appendChild(clone);
    renderEl = clone;
  }

  try {
    return await html2canvas(renderEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });
  } finally {
    if (clone && clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  }
}

/**
 * Download an HTML element as PNG image file
 */
export async function exportElementAsImage(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureElementToCanvas(element);
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

/**
 * Download an HTML element as PDF document
 */
export async function exportElementAsPDF(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureElementToCanvas(element);
  const imgData = canvas.toDataURL("image/png");

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Determine orientation & size
  const orientation = imgWidth > imgHeight ? "l" : "p";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [imgWidth, imgHeight],
  });

  pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  pdf.save(`${filename}.pdf`);
}

/**
 * Share PNG image or PDF document using Web Share API (navigator.share)
 * Fallback to direct file download if Web Share API is not supported (e.g. desktop browsers)
 */
export async function shareElementAsFile(
  element: HTMLElement,
  filename: string,
  title: string,
  type: "image" | "pdf" = "image"
): Promise<boolean> {
  const canvas = await captureElementToCanvas(element);

  if (type === "image") {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }

        const file = new File([blob], `${filename}.png`, { type: "image/png" });

        // Check if Web Share API is available and can share files
        if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title,
              text: `${title} - KTM Digital Printing POS`,
              files: [file],
            });
            resolve(true);
            return;
          } catch (err: any) {
            // User cancelled share dialog or error occurred
            if (err.name === "AbortError") {
              resolve(true);
              return;
            }
          }
        }

        // Fallback: Trigger direct image download
        const dataUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${filename}.png`;
        link.href = dataUrl;
        link.click();
        setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);
        resolve(true);
      }, "image/png");
    });
  } else {
    // Generate PDF
    const imgData = canvas.toDataURL("image/png");
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const orientation = imgWidth > imgHeight ? "l" : "p";
    const pdf = new jsPDF({
      orientation,
      unit: "px",
      format: [imgWidth, imgHeight],
    });
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    const pdfBlob = pdf.output("blob");
    const file = new File([pdfBlob], `${filename}.pdf`, { type: "application/pdf" });

    if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title,
          text: `${title} - KTM Digital Printing POS`,
          files: [file],
        });
        return true;
      } catch (err: any) {
        if (err.name === "AbortError") {
          return true;
        }
      }
    }

    // Fallback: Trigger PDF download
    pdf.save(`${filename}.pdf`);
    return true;
  }
}
