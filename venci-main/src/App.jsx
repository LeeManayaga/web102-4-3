import "./App.css";
import { useState, useEffect } from "react";

//api key
const ACCESS_KEY = import.meta.env.VITE_APP_ACCESS_KEY;

function App() {
  const [cat, setCat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [breeds, setBreeds] = useState([]);

  // banList is kept in memory only; it will reset on page refresh
  const [banList, setBanList] = useState([]);

  function toggleBan(type, value) {
    const key = `${type}:${String(value).toLowerCase()}`; // normalized
    setBanList((prev) => {
      const exists = prev.includes(key);
      if (exists) return prev.filter((k) => k !== key);
      return [key, ...prev];
    });
  }

  // helper to check whether a breed is banned
  function isBanned(item, list) {
    if (!list || list.length === 0) return false;
    // check id (only if item has an id)
    if (item && item.id && list.includes(`id:${String(item.id).toLowerCase()}`))
      return true;
    // check breed names 
    const breedsArr = Array.isArray(item.breeds) ? item.breeds : [];
    for (const b of breedsArr) {
      if (b && b.name && list.includes(`breed:${String(b.name).toLowerCase()}`))
        return true;
    }
    return false;
  }

  useEffect(() => {
    fetchBreeds();
  }, []);

  // fetch breeds list once
  async function fetchBreeds() {
    try {
      const opts = ACCESS_KEY ? { headers: { "x-api-key": ACCESS_KEY } } : {};
      const res = await fetch("https://api.thecatapi.com/v1/breeds", opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBreeds(data);

      console.log(`-- (${data.length}) breeds loaded`);
    } catch (err) {
      console.error("fetchBreeds error", err);
    }
  }

  async function fetchImageForBreed(breedId) {
    setLoading(true);
    setError(null);
    try {
      const opts = ACCESS_KEY ? { headers: { "x-api-key": ACCESS_KEY } } : {};
      const res = await fetch(
        `https://api.thecatapi.com/v1/images/search?breed_id=${breedId}&limit=1`,
        opts
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.json();
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error("No image returned for breed");
      }
      const picked = arr[0];
      if (!Array.isArray(picked.breeds) || picked.breeds.length === 0) {
        const breedObj = breeds.find((b) => b.id === breedId);
        if (breedObj) picked.breeds = [breedObj];
      }
      setCat(picked);
    } catch (e) {
      setError(e?.message || "Unknown error");
      setCat(null);
    } finally {
      setLoading(false);
    }
  }

  async function onDiscoverClick() {
    // ensure breeds are loaded
    if (!breeds || breeds.length === 0) {
      setError("Breed list not loaded yet. Please wait and try again.");
      return;
    }

    // filter out banned breeds (banList stores keys like "breed:persian")
    const availableBreeds = breeds.filter((b) => {
      // create a lightweight breed-like object for isBanned
      const breedLike = { id: b.id, breeds: [{ name: b.name }] };
      return !isBanned(breedLike, banList);
    });

    // pick a random available breed and fetch an image for it
    const chosen =
      availableBreeds[Math.floor(Math.random() * availableBreeds.length)];
    // Reset any previous UI error
    setError(null);
    await fetchImageForBreed(chosen.id);
  }
  return (
    <>
      <h1>Veni Vici</h1>
      <h2>The cat you may not know</h2>
      <p>🐈😺🐈😺🐈😺🐈😺</p>
      <button
        className="discover-button"
        onClick={onDiscoverClick}
        disabled={loading}
      >
        {loading ? "Searching.." : "Discover"}
      </button>

      {/* Error */}
      {error && (
        <p style={{ color: "crimson", marginTop: 12 }}>Error: {error}</p>
      )}

      {/* Initial hint */}
      {!cat && !loading && !error && (
        <p className="read-the-docs" style={{ marginTop: 12 }}>
          Click "Discover" to fetch a cat image.
        </p>
      )}

      {banList.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <strong>Ban list:</strong>{" "}
          {banList.map((k) => {
            const [, val] = k.split(":");
            // try to find a prettier label from the breeds list
            const pretty = (() => {
              if (k.startsWith("breed:")) {
                const found = breeds.find(
                  (b) => String(b.name).toLowerCase() === val
                );
                return found ? found.name : val;
              }
              // id or other key types: show raw value
              return val;
            })();
            return (
              <button
                key={k}
                onClick={() =>
                  setBanList((prev) => prev.filter((x) => x !== k))
                }
                className="cat-attribute banned"
              >
                {pretty}
              </button>
            );
          })}
        </div>
      )}
      {/* Cat card */}
      {cat && (
        <div className="cat-card">
          {/*cat attributes*/}

          <p style={{ margin: "4px 0" }}>
            <strong>Breed:</strong>{" "}
                  {Array.isArray(cat?.breeds) && cat.breeds.length
              ? cat.breeds.map((b) => (
                  <button
                    key={b.id || b.name}
                    onClick={() => toggleBan("breed", b.name)}
                    className={`cat-attribute${banList.includes(`breed:${String(
                      b.name
                    ).toLowerCase()}`)
                      ? " banned"
                      : ""}`}
                  >
                    {b.name}
                  </button>
                ))
              : "Unknown"}
          </p>

          <img
            src={cat.url}
            alt={`Cat ${cat.id}`}
            style={{ width: "100%", height: "auto", borderRadius: 6 }}
          />
        </div>
      )}
    </>
  );
}

export default App;
