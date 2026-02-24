import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import IntroPage from "./pages/IntroPage";
import TakingPicture from "./pages/TakingPicture";
import LoadingPage from "./pages/LoadingPage";
import { useCallback, useState } from "react";
import ResultPage from "./pages/ResultPage";
import { postJson } from "./lib/api";

function App() {
  const [generationData, setGenerationData] = useState(null);
  const [generationStatus, setGenerationStatus] = useState("idle");
  const [generationError, setGenerationError] = useState("");

  const resetFlow = useCallback(() => {
    setGenerationData(null);
    setGenerationStatus("idle");
    setGenerationError("");
  }, []);

  const startGeneration = useCallback(async (photoDataUrl) => {
    setGenerationData(null);
    setGenerationStatus("running");
    setGenerationError("");

    try {
      const data = await postJson("/api/generate", { photoDataUrl });
      setGenerationData(data);
      setGenerationStatus("success");
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed.";
      setGenerationStatus("error");
      setGenerationError(message);
      throw error;
    }
  }, []);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IntroPage onStart={resetFlow} />} />
          <Route
            path="/capture"
            element={
              <TakingPicture
                onStartGeneration={startGeneration}
                generationStatus={generationStatus}
                generationError={generationError}
              />
            }
          />
          <Route
            path="/loading"
            element={
              <LoadingPage
                generationData={generationData}
                generationStatus={generationStatus}
                generationError={generationError}
              />
            }
          />
          <Route
            path="/result"
            element={<ResultPage generationData={generationData} onResetFlow={resetFlow} />}
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
