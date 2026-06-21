import { API_ENDPOINT } from "@/constants/apiConfig";

export async function matchCard(uri: string, tcgName: string): Promise<string> {
    try {
        console.log("Uploading file:");
        let uriArray = uri.split(".");
        let fileType = uriArray[uriArray.length - 1];
      
                let formData = new FormData();
                formData.append("file", ({
                    uri,
                    name: `photo.${fileType}`,
                    type: `image/${fileType}`,
                } as any));

        // Define request options
        const requestOptions = {
            method: "POST",
            body: formData,
            headers: {
                Accept: "application/json",
                "Content-Type": "multipart/form-data",
              },
        };

        const result = await fetch(`${API_ENDPOINT}/matchCard?tcg_name=${encodeURIComponent(tcgName)}`, requestOptions);
        const textResult = await result.text();
        console.log(textResult);
        return textResult
    } catch (error) {
        console.error("Error uploading file:", error);
        return "Error uploading file";
    }
}