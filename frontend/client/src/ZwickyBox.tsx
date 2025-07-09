import { useState, useEffect, useRef } from "react";

interface ZwickyBoxData {
   columns: string[];
   rows: string[][];
}

interface SavedBox {
   id: number | null;
   data: ZwickyBoxData;
}

export function ZwickyBox() {
   const [data, setData] = useState<ZwickyBoxData>({
      columns: ["Parameter 1", "Parameter 2"],
      rows: [
         ["Value 1-1", "Value 2-1"],
         ["Value 1-2", "Value 2-2"],
      ],
   });
   const [boxId, setBoxId] = useState<number | null>(null);
   const [saveStatus, setSaveStatus] = useState<
      "saved" | "saving" | "idle" | "error"
   >("idle");
   const saveTimeoutRef = useRef<number | null>(null);

   // Load initial data
   useEffect(() => {
      fetch("/api/zwicky-box")
         .then((res) => {
            if (!res.ok) {
               throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
         })
         .then((saved: SavedBox) => {
            if (saved.id) {
               setBoxId(saved.id);
               setData(saved.data);
            }
         })
         .catch((error) => {
            console.error("Load error:", error);
            setSaveStatus("error");
            setTimeout(() => setSaveStatus("idle"), 3000);
         });
   }, []);

   // Auto-save when data changes
   useEffect(() => {
      if (saveTimeoutRef.current) {
         clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus("idle");
      saveTimeoutRef.current = setTimeout(() => {
         setSaveStatus("saving");
         const url = boxId ? `/api/zwicky-box/${boxId}` : "/api/zwicky-box";
         const method = boxId ? "PUT" : "POST";

         fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data }),
         })
            .then((res) => {
               if (!res.ok) {
                  throw new Error(`HTTP error! status: ${res.status}`);
               }
               return res.json();
            })
            .then((result) => {
               if (!boxId && result.id) {
                  setBoxId(result.id);
               }
               setSaveStatus("saved");
               setTimeout(() => setSaveStatus("idle"), 2000);
            })
            .catch((error) => {
               console.error("Save error:", error);
               setSaveStatus("error");
               setTimeout(() => setSaveStatus("idle"), 3000);
            });
      }, 1000); // Save after 1 second of inactivity

      return () => {
         if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
         }
      };
   }, [data, boxId]);

   const addColumn = () => {
      setData((prev) => ({
         columns: [...prev.columns, `Parameter ${prev.columns.length + 1}`],
         rows: prev.rows.map((row) => [...row, ""]),
      }));
   };

   const addRow = () => {
      setData((prev) => ({
         ...prev,
         rows: [...prev.rows, new Array(prev.columns.length).fill("")],
      }));
   };

   const updateCell = (rowIndex: number, colIndex: number, value: string) => {
      setData((prev) => ({
         ...prev,
         rows: prev.rows.map((row, rIdx) =>
            rIdx === rowIndex
               ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
               : row,
         ),
      }));
   };

   const updateColumn = (colIndex: number, value: string) => {
      setData((prev) => ({
         ...prev,
         columns: prev.columns.map((col, idx) =>
            idx === colIndex ? value : col,
         ),
      }));
   };

   return (
      <div className="zwicky-box">
         <div className="controls">
            <button onClick={addColumn}>Add Column</button>
            <button onClick={addRow}>Add Row</button>
            <span className={`save-status ${saveStatus}`}>
               {saveStatus === "saving" && "Saving..."}
               {saveStatus === "saved" && "✓ Saved"}
               {saveStatus === "error" && "✗ Error saving"}
            </span>
         </div>

         <table className="zwicky-table">
            <thead>
               <tr>
                  {data.columns.map((col, colIndex) => (
                     <th key={colIndex}>
                        <input
                           type="text"
                           value={col}
                           onChange={(e) =>
                              updateColumn(colIndex, e.target.value)
                           }
                           placeholder="Parameter name"
                        />
                     </th>
                  ))}
               </tr>
            </thead>
            <tbody>
               {data.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                     {row.map((cell, colIndex) => (
                        <td key={colIndex}>
                           <input
                              type="text"
                              value={cell}
                              onChange={(e) =>
                                 updateCell(rowIndex, colIndex, e.target.value)
                              }
                              placeholder="Value"
                           />
                        </td>
                     ))}
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}
