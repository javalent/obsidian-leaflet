const ctx: Worker = self as any;

// Respond to message from parent thread
ctx.onmessage = async (event) => {
    if (!event.data.type) return;

    if (event.data.type === "url") {
        for (let { blob, id } of event.data.blobs) {
            ctx.postMessage({ data: await toDataURL(blob), id });
        }
    }
};

export default {} as typeof Worker & (new () => Worker);

async function toDataURL(
    blob: Blob
): Promise<{ data: string; h: number; w: number }> {
    //determine link type
    return new Promise(async (resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === "string") {
                let data = reader.result.slice(
                    reader.result.indexOf(";base64,")
                );
                resolve({ data, h, w });
            } else {
                reject();
            }
        };

        const bitmap = await createImageBitmap(blob);
        const { height: h, width: w } = bitmap;

        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
