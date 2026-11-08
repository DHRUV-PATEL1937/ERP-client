import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { api } from "../../lib/api";
import PermissionGate from "../../app/PermissionGate";
import { Button } from "../../components/ui";
import { useToast } from "../../app/providers";
export default function ProductImage({ product }) {
  const query = useQuery({
    queryKey: ["product-image", product._id],
    queryFn: () => api(`/product-images/${product._id}`),
  });
  const [file, setFile] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const client = useQueryClient(),
    toast = useToast();
  return (
    <section className="panel product-image-panel">
      <div className="product-image-preview">
        {query.data?.data ? (
          <img
            src={`data:${query.data.data.contentType};base64,${query.data.data.base64}`}
            alt={product.name}
          />
        ) : (
          <>
            <ImagePlus size={28} />
            <span>No product photo</span>
          </>
        )}
      </div>
      <div>
        <h2>Catalogue photo</h2>
        <p>
          JPEG, PNG or WebP · up to 1 MB · stored with your organization
          records.
        </p>
        <PermissionGate>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                if (file.size > 1048576)
                  throw new Error("Choose an image smaller than 1 MB");
                await api(`/product-images/${product._id}`, {
                  method: "PUT",
                  body: file,
                });
                setFile(null);
                e.target.reset();
                client.invalidateQueries();
                toast("Product photo saved");
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="image-file-field">
              Choose product photo
              <input
                aria-label="Product photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </label>
            <Button disabled={!file || busy}>
              {busy ? "Uploading…" : "Save photo"}
            </Button>
          </form>
        </PermissionGate>
        {(error || query.error) && (
          <p className="error-text" role="alert">
            {error || query.error.message}
          </p>
        )}
      </div>
    </section>
  );
}
