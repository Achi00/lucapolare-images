import express from "express";
import fetch from "node-fetch";
import axios from "axios";

const app = express();
const port = 8000;

// This array will hold the URLs of the images fetched from Instagram
let imageUrls = [];
let videoUrls = [];

// Helper functions to get URLs by index
const getImageUrlForId = (id) => imageUrls[id];
const getVideoUrlForId = (id) => videoUrls[id];

app.use("/proxy", async (req, res) => {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).send("No URL provided");
  }

  try {
    const response = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "stream",
    });

    // Forward the response headers
    res.set({ ...response.headers });

    // Pipe the image data to the client
    response.data.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching image");
  }
});

// Serve the static HTML file
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "." });
});

// Fetch and process data from Instagram
app.get("/data", async (req, res) => {
  try {
    const response = await fetch(
      "https://i.instagram.com/api/v1/users/web_profile_info/?username=lucapolare",
      {
        method: "GET",
        headers: {
          "User-Agent": "iphone_ua",
          "x-ig-app-id": "936619743392459",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch data");
    }

    const data = await response.json();
    const edges = data.data.user.edge_owner_to_timeline_media.edges;

    // Populate the imageUrls and videoUrls arrays
    imageUrls = edges
      .filter(
        ({ node }) =>
          node.__typename === "GraphImage" || node.__typename === "GraphSidecar"
      )
      .map(({ node }) => node.display_url);

    videoUrls = edges
      .filter(({ node }) => node.__typename === "GraphVideo")
      .map(({ node }) => node.video_url);

    res.json({ images: imageUrls, videos: videoUrls });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Route to serve images by index
app.get("/media/image/:id", (req, res) => {
  const index = parseInt(req.params.id, 10); // Convert id to a number
  if (index >= 0 && index < imageUrls.length) {
    const imageUrl = imageUrls[index];
    res.redirect(imageUrl);
  } else {
    res.status(404).send("Image not found");
  }
});

// Route to serve videos by index
app.get("/media/video/:id", (req, res) => {
  const index = parseInt(req.params.id, 10); // Convert id to a number
  if (index >= 0 && index < videoUrls.length) {
    const videoUrl = videoUrls[index];
    res.redirect(videoUrl);
  } else {
    res.status(404).send("Video not found");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
