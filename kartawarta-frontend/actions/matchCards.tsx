import { API_ENDPOINT } from "@/constants/apiConfig";

export async function matchCards(uri: string): Promise<string> {
    try {
        console.log("Uploading file:");


        // log

        let uriArray = uri.split(".");
        let fileType = uriArray[uriArray.length - 1];
      
        let formData = new FormData();
        formData.append("file", {
          uri,
          name: `photo.${fileType}`,
          type: `image/${fileType}`,
        });

        // Define request options
        const requestOptions = {
            method: "POST",
            body: formData,
            headers: {
                Accept: "application/json",
                "Content-Type": "multipart/form-data",
              },
        };

        //hello world
        // fetch("http://192.168.1.3:8000").then(response => response.text()).then(result => console.log(result)).catch(error => console.log('error', error));
        // Perform the fetch request
        const result = await fetch(`${API_ENDPOINT}/matchCards`, requestOptions);
        const textResult = await result.text();
        console.log(textResult);
        return textResult
    } catch (error) {
        console.error("Error uploading file:", error);
        return "Error uploading file";
    }
}