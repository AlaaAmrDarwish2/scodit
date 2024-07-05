import React, { useState, useEffect } from "react";
import "./MyProject.css";
import axios from "axios";
import { storage } from "../../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
const MyProject = () => {
  const [image, setImage] = useState(null);
  const [htmlCode, setHtmlCode] = useState(null);
  useEffect(() => {
    const storedImage = localStorage.getItem("projectImage");
    if (storedImage) {
      setImage(storedImage);
    }
    return () => {
      localStorage.removeItem("projectImage");
      setImage(null);
    };
  }, []);
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    const storageRef = ref(storage, `images/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    reader.onload = () => {
      const imageData = reader.result;
      setImage(imageData);
      localStorage.setItem("projectImage", imageData);
      // Make request to Roboflow model
      axios({
        method: "POST",
        url: "https://detect.roboflow.com/webui-fheoa-github/1",
        params: {
          api_key: "ySeNjb3skV1sYAcgvqSg",
        },
        data: imageData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
        .then(function (response) {
          const predictions = response.data.predictions;
          const generatedHtmlCode = generateHTML(predictions);
          setHtmlCode(generatedHtmlCode);
        })
        .catch(function (error) {
          console.log(error.message);
        });
    };
    reader.readAsDataURL(file);
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
      },
      (error) => {
        console.log("image not uploaded because", error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log("File available at", downloadURL);
        });
      }
    );
  };
  const generateHTML = (predictions) => {
    const classToHtmlTag = {
      button: "button",
      checkbox: 'input type="checkbox"',
      container: "div",
      image: "img",
      "number-input": 'input type="number"',
      radio: 'input type="radio"',
      search: 'input type="search"',
      select: "select",
      table: "table",
      text: "span",
      textbox: 'input type="text"',
      toggle: 'input type="checkbox"',
      "icon-button": "button",
      input: "input",
      label: "label",
      link: "a",
      slider: 'input type="range"',
      textarea: "textarea",
    };
    let htmlCode = `<!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
           
            overflow: scroll; 
            background-color: #e0f7fa; /* Light cyan background */
            font-family: Arial, sans-serif;
        }
        .container {
            position: relative;
            margin: 10px auto;
            padding: 20px;
            background-color: #ffffff; /* White background */
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            max-width: 1000px;
            min-height: 550px;
            overflow: scroll; /* Ensures elements stay within the container */
        }
        .ele { 
            position: absolute; 
            border: 2px solid rgba(69, 175, 240, 0.5); 
            border-radius: 4px; 
            box-shadow: 0 2px 8px rgba(81, 84, 235, 0.3); 
            background-color: rgba(181, 232, 251, 0.7);
        }
        .text {
            position: absolute;
            color:rgba(2, 56, 90, 0.5); 
            font-size: 25px;
        }
        .button {
           position: absolute;
            background-color: #5aa8d8; /* Blue background */
            border: 2px solid transparent; /* Add transparent border */
            color: white;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            transition: background-color 0.4s, color 0.4s, box-shadow 0.4s; /* Specify transitions */
            cursor: pointer;
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .button:hover {
            background-color: white; /* White background on hover */
            color: #5aa8d8; /* Blue text on hover */
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3); /* Increased shadow */
        }
    </style>
    </head>
    <body>
    <div class="container">
    `;
    predictions.forEach((prediction) => {
      const className = prediction.class;
      const htmlTag = classToHtmlTag[className];
      const xmin = prediction.x;
      const ymin = prediction.y;
      const width = prediction.width;
      const height = prediction.height;
      const styles = {
        position: "absolute",
        left: `${prediction.x}px`,
        top: `${prediction.y}px`,
        width: `${prediction.width}px`,
        height: `${prediction.height}px`,
      };
      const styleString = Object.entries(styles)
        .map(([key, value]) => `${key}: ${value};`)
        .join(" ");
      if (htmlTag) {
        const style = `style=" top: ${ymin}px; left: ${xmin}px; width: ${width}px; height: ${height}px;"`;
        if (htmlTag.startsWith("input")) {
          htmlCode += `<${htmlTag} class="ele" style="${styleString}" />\n`;
        } else if (htmlTag.startsWith("img")) {
          htmlCode += `<${htmlTag} class="ele" style="${styleString}" src="C:/tflite1/images.png" />\n`;
        } else if (htmlTag === "text" || htmlTag === "label") {
          htmlCode += `<${htmlTag} ${style} class="text">name :</${htmlTag}>\n`;
        } else if (htmlTag.startsWith("button")) {
          htmlCode += `<${htmlTag} ${style} class="button">Submit</${htmlTag}>\n`;
        }
        else {
          htmlCode += `<${htmlTag} class="ele" style="${styleString}"></${htmlTag}>\n`;
        }
      }
    });
    htmlCode += "</div>\n</body>\n</html>";
    return htmlCode;
  };
  const handleDownload = () => {
    if (htmlCode) {
      const fileNametxt = `output_${Date.now()}.txt`;
      const fileNamehtml = `output_${Date.now()}.html`;
      const txtBlob = new Blob([htmlCode], { type: "text/plain" });
      const htmlBlob = new Blob([htmlCode], { type: "text/html" });
      // Create URLs for each Blob
      const txtUrl = window.URL.createObjectURL(txtBlob);
      const htmlUrl = window.URL.createObjectURL(htmlBlob);
      // Create download links
      const txtLink = document.createElement("a");
      txtLink.href = txtUrl;
      txtLink.setAttribute("download", fileNametxt);
      const htmlLink = document.createElement("a");
      htmlLink.href = htmlUrl;
      htmlLink.setAttribute("download", fileNamehtml);
      // Append links to the document and trigger click events to download files
      document.body.appendChild(txtLink);
      txtLink.click();
      document.body.removeChild(txtLink);
      document.body.appendChild(htmlLink);
      htmlLink.click();
      document.body.removeChild(htmlLink);
      // Clean up
      window.URL.revokeObjectURL(txtUrl);
      window.URL.revokeObjectURL(htmlUrl);
      const storageRef = ref(storage, `code/${fileNametxt}`);
      const uploadTask = uploadBytesResumable(storageRef, txtBlob);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
        },
        (error) => {
          console.log("file not uploaded because", error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log("File available at", downloadURL);
          });
        }
      );
      // Reset the image after download
      localStorage.removeItem("projectImage");
      setImage(null);
    }
  };
  return (
    <div className="projectContent">
      <h1>My Project</h1>
      <div className="display">
        <div className="buttons">
          <input
            className="choose-file"
            type="file"
            onChange={handleImageUpload}
            id="actual-btn"
            hidden
          />
          <label className="choose-file" htmlFor="actual-btn">
            Choose File
          </label>
          {htmlCode && (
            <button onClick={handleDownload} className="downloadButton">
              Download Code
            </button>
          )}
        </div>
        {image && <img src={image} alt="Uploaded" width="400" height="400" />}
      </div>
    </div>
  );
};
export default MyProject;
