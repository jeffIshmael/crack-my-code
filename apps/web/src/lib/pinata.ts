import { PinataSDK } from "pinata";

export const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT || "",
  pinataGateway: process.env.PINATA_GATEWAY || "blue-late-antelope-447.mypinata.cloud",
});

/**
 * Uploads a JSON object to IPFS using Pinata
 * @param data The JSON object to upload
 * @param fileName Optional filename for the upload
 * @returns The CID of the uploaded content
 */
export async function uploadToIPFS(data: any, fileName: string = "game-history.json") {
  try {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const file = new File([blob], fileName, { type: "application/json" });
    const upload = await pinata.upload.public.file(file);
    return upload.cid;
  } catch (error) {
    console.error("IPFS upload failed:", error);
    return "";
  }
}
