import { useState, useEffect, useRef } from "react";

interface VimInfoProps {
  vimEnabled: boolean;
  mode: string;
  onToggleVim: () => void;
}

function VimInfo({ vimEnabled, mode, onToggleVim }: VimInfoProps) {
  if (!vimEnabled) {
    return (
      <div className="vim-info">
        <button onClick={onToggleVim} className="vim-toggle-btn">
          Enable Vim Mode
        </button>
      </div>
    );
  }

  return (
    <div className="vim-info">
      <span className="vim-help-text">Press ? for help</span>
      <button onClick={onToggleVim} className="vim-toggle-btn">
        Disable Vim Mode
      </button>
      <span className={`mode ${mode}`}>{mode}</span>
    </div>
  );
}

interface ControlsProps {
  onAddColumn: () => void;
  onAddRow: () => void;
  onDeleteColumn: () => void;
  onDeleteRow: () => void;
  canDeleteColumn: boolean;
  canDeleteRow: boolean;
  saveStatus: string;
}

function Controls({ 
  onAddColumn, 
  onAddRow, 
  onDeleteColumn, 
  onDeleteRow, 
  canDeleteColumn, 
  canDeleteRow, 
  saveStatus 
}: ControlsProps) {
  return (
    <div className="controls">
      <button onClick={onAddColumn}>Add Column</button>
      <button onClick={onAddRow}>Add Row</button>
      <button onClick={onDeleteColumn} disabled={!canDeleteColumn}>
        Delete Last Column
      </button>
      <button onClick={onDeleteRow} disabled={!canDeleteRow}>
        Delete Last Row
      </button>
      <span className={`save-status ${saveStatus}`}>
        {saveStatus === "saving" && "Saving..."}
        {saveStatus === "saved" && "✓ Saved"}
        {saveStatus === "error" && "✗ Error saving"}
      </span>
    </div>
  );
}

interface HelpOverlayProps {
  onClose: () => void;
}

function HelpOverlay({ onClose }: HelpOverlayProps) {
  return (
    <>
      <div className="help-backdrop" onClick={onClose} />
      <div className="help-overlay">
        <button className="close" onClick={onClose}>×</button>
        <h3>Vim Keybindings</h3>
        
        <table className="help-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Key</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr><td rowSpan={7}>Navigation</td><td><span className="key">h</span></td><td>Move left</td></tr>
            <tr><td><span className="key">j</span></td><td>Move down</td></tr>
            <tr><td><span className="key">k</span></td><td>Move up</td></tr>
            <tr><td><span className="key">l</span></td><td>Move right</td></tr>
            <tr><td><span className="key">0</span></td><td>Go to first column</td></tr>
            <tr><td><span className="key">$</span></td><td>Go to last column</td></tr>
            <tr><td><span className="key">gg</span></td><td>Go to first row</td></tr>
            <tr><td></td><td><span className="key">G</span></td><td>Go to last row</td></tr>
            
            <tr><td rowSpan={3}>Modes</td><td><span className="key">i</span></td><td>Enter insert mode</td></tr>
            <tr><td><span className="key">a</span></td><td>Enter insert mode (append)</td></tr>
            <tr><td><span className="key">ESC</span></td><td>Return to normal mode</td></tr>
            
            <tr><td rowSpan={3}>Search</td><td><span className="key">/</span></td><td>Start search</td></tr>
            <tr><td><span className="key">n</span></td><td>Next match</td></tr>
            <tr><td><span className="key">N</span></td><td>Previous match</td></tr>
            
            <tr><td rowSpan={3}>Rows</td><td><span className="key">o</span></td><td>Add row below</td></tr>
            <tr><td><span className="key">O</span></td><td>Add row above</td></tr>
            <tr><td><span className="key">dd</span></td><td>Delete current row</td></tr>
            
            <tr><td rowSpan={2}>Columns</td><td><span className="key">A</span></td><td>Add column after current</td></tr>
            <tr><td><span className="key">dc</span></td><td>Delete current column</td></tr>
            
            <tr><td rowSpan={3}>Editing</td><td><span className="key">x</span></td><td>Clear current cell</td></tr>
            <tr><td><span className="key">u</span></td><td>Undo</td></tr>
            <tr><td><span className="key">Ctrl+r</span></td><td>Redo</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

interface ZwickyBoxData {
   columns: string[];
   rows: string[][];
   problem?: string;
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
      problem: "",
   });
   const [boxId, setBoxId] = useState<number | null>(null);
   const [saveStatus, setSaveStatus] = useState<
      "saved" | "saving" | "idle" | "error"
   >("idle");
   const saveTimeoutRef = useRef<number | null>(null);
   
   // Vim mode state
   const [vimEnabled, setVimEnabled] = useState(false);
   const [mode, setMode] = useState<"normal" | "insert" | "search">("normal");
   const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({
      row: -2, // -2 means problem statement, -1 means header row
      col: 0,
   });
   const [searchQuery, setSearchQuery] = useState("");
   const [searchMatches, setSearchMatches] = useState<Array<{ row: number; col: number }>>([]);
   const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
   const [showSearchInput, setShowSearchInput] = useState(false);
   const [showHelp, setShowHelp] = useState(false);
   
   // Undo/redo stacks
   const [undoStack, setUndoStack] = useState<ZwickyBoxData[]>([]);
   const [redoStack, setRedoStack] = useState<ZwickyBoxData[]>([]);
   const maxUndoStackSize = 50;

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

   // Helper to save state for undo
   const saveStateForUndo = () => {
      setUndoStack((prev) => {
         const newStack = [...prev, { 
            columns: [...data.columns], 
            rows: data.rows.map(row => [...row]) 
         }];
         // Limit stack size
         if (newStack.length > maxUndoStackSize) {
            newStack.shift();
         }
         return newStack;
      });
      // Clear redo stack when new action is performed
      setRedoStack([]);
   };

   const performUndo = () => {
      if (undoStack.length === 0) return;
      
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack((prev) => [...prev, { 
         columns: [...data.columns], 
         rows: data.rows.map(row => [...row]) 
      }]);
      setData(previousState);
      setUndoStack((prev) => prev.slice(0, -1));
   };

   const performRedo = () => {
      if (redoStack.length === 0) return;
      
      const nextState = redoStack[redoStack.length - 1];
      saveStateForUndo();
      setData(nextState);
      setRedoStack((prev) => prev.slice(0, -1));
   };

   const addColumn = () => {
      saveStateForUndo();
      setData((prev) => ({
         columns: [...prev.columns, `Parameter ${prev.columns.length + 1}`],
         rows: prev.rows.map((row) => [...row, ""]),
      }));
   };

   const addRow = () => {
      saveStateForUndo();
      setData((prev) => ({
         ...prev,
         rows: [...prev.rows, new Array(prev.columns.length).fill("")],
      }));
   };

   const updateCell = (rowIndex: number, colIndex: number, value: string) => {
      // Don't save every keystroke, only on blur or mode change
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
      // Don't save every keystroke, only on blur or mode change
      setData((prev) => ({
         ...prev,
         columns: prev.columns.map((col, idx) =>
            idx === colIndex ? value : col,
         ),
      }));
   };

   const updateProblem = (value: string) => {
      setData((prev) => ({
         ...prev,
         problem: value,
      }));
   };

   const deleteRow = (rowIndex: number) => {
      if (data.rows.length > 1) {
         saveStateForUndo();
         setData((prev) => ({
            ...prev,
            rows: prev.rows.filter((_, idx) => idx !== rowIndex),
         }));
      }
   };

   const deleteColumn = (colIndex: number) => {
      if (data.columns.length > 1) {
         saveStateForUndo();
         const newColumns = data.columns.filter((_, idx) => idx !== colIndex);
         const newRows = data.rows.map(row => 
            row.filter((_, idx) => idx !== colIndex)
         );
         setData({ ...data, columns: newColumns, rows: newRows });
      }
   };

   // Keyboard event handler
   useEffect(() => {
      if (!vimEnabled) return;

      const handleKeyDown = (e: KeyboardEvent) => {
         // Handle help overlay
         if (showHelp && e.key === "Escape") {
            setShowHelp(false);
            return;
         }

         // Handle search mode
         if (mode === "search") {
            if (e.key === "Escape") {
               setShowSearchInput(false);
               setMode("normal");
               setSearchQuery("");
               setSearchMatches([]);
            }
            return;
         }

         // Handle normal mode
         if (mode === "normal") {
            // Prevent default browser behavior for vim keys
            if (["h", "j", "k", "l", "0", "$", "g", "G", "i", "a", "/", "o", "O", "d", "x", "u", "y", "p", "P", "n", "N", "A", "C", "?"].includes(e.key)) {
               e.preventDefault();
            }

            switch (e.key) {
               // Navigation
               case "h": // Left
                  setSelectedCell((prev) => ({
                     ...prev,
                     col: prev.row === -2 ? 0 : Math.max(0, prev.col - 1),
                  }));
                  break;
               case "l": // Right
                  setSelectedCell((prev) => ({
                     ...prev,
                     col: prev.row === -2 ? 0 : Math.min(data.columns.length - 1, prev.col + 1),
                  }));
                  break;
               case "j": // Down
                  setSelectedCell((prev) => ({
                     ...prev,
                     row: Math.min(data.rows.length - 1, prev.row + 1),
                  }));
                  break;
               case "k": // Up
                  setSelectedCell((prev) => ({
                     ...prev,
                     row: Math.max(-2, prev.row - 1),
                  }));
                  break;
               case "0": // Beginning of row
                  setSelectedCell((prev) => ({ ...prev, col: 0 }));
                  break;
               case "$": // End of row
                  setSelectedCell((prev) => ({
                     ...prev,
                     col: prev.row === -2 ? 0 : data.columns.length - 1,
                  }));
                  break;
               case "g":
                  if (e.ctrlKey) break; // Ignore Ctrl+G
                  // Wait for second 'g' for gg command
                  const handleSecondG = (e2: KeyboardEvent) => {
                     if (e2.key === "g") {
                        setSelectedCell((prev) => ({ ...prev, row: -2 }));
                     }
                     window.removeEventListener("keydown", handleSecondG);
                  };
                  window.addEventListener("keydown", handleSecondG);
                  setTimeout(() => window.removeEventListener("keydown", handleSecondG), 1000);
                  break;
               case "G": // Last row
                  setSelectedCell((prev) => ({
                     ...prev,
                     row: data.rows.length - 1,
                  }));
                  break;

               // Mode switching
               case "i": // Insert mode
               case "a": // Insert mode (append)
                  setMode("insert");
                  // Focus the input at selected cell
                  setTimeout(() => {
                     let input: HTMLInputElement | null = null;
                     
                     if (selectedCell.row === -2) {
                        // Problem statement
                        input = document.querySelector('#problem') as HTMLInputElement;
                     } else {
                        // Table cells
                        input = document.querySelector(
                           `[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`
                        ) as HTMLInputElement;
                     }
                     
                     if (input) {
                        input.focus();
                        // For 'a', move cursor to end
                        if (e.key === "a") {
                           input.setSelectionRange(input.value.length, input.value.length);
                        }
                     }
                  }, 0);
                  break;

               // Search
               case "/": // Start search
                  setMode("search");
                  setShowSearchInput(true);
                  setSearchQuery("");
                  break;
               
               // Search navigation
               case "n": // Next match
                  if (searchMatches.length > 0) {
                     const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
                     setCurrentMatchIndex(nextIndex);
                     setSelectedCell(searchMatches[nextIndex]);
                  }
                  break;
               case "N": // Previous match
                  if (searchMatches.length > 0) {
                     const prevIndex = currentMatchIndex === 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
                     setCurrentMatchIndex(prevIndex);
                     setSelectedCell(searchMatches[prevIndex]);
                  }
                  break;

               // Row operations
               case "o": // Add row below
                  addRow();
                  setSelectedCell((prev) => ({
                     ...prev,
                     row: prev.row + 1,
                  }));
                  break;
               case "O": // Add row above
                  if (selectedCell.row >= 0) {
                     saveStateForUndo();
                     const newRows = [...data.rows];
                     newRows.splice(selectedCell.row, 0, new Array(data.columns.length).fill(""));
                     setData((prev) => ({ ...prev, rows: newRows }));
                  }
                  break;
               
               // Delete operations - check for 'd' prefix
               case "d":
                  const handleSecondD = (e2: KeyboardEvent) => {
                     if (e2.key === "d") {
                        // Delete row
                        if (selectedCell.row >= 0 && data.rows.length > 1) {
                           saveStateForUndo();
                           const newRows = data.rows.filter((_, idx) => idx !== selectedCell.row);
                           setData((prev) => ({ ...prev, rows: newRows }));
                           // Move selection up if we deleted the last row
                           if (selectedCell.row >= newRows.length) {
                              setSelectedCell((prev) => ({ ...prev, row: newRows.length - 1 }));
                           }
                        }
                     } else if (e2.key === "c") {
                        // Delete column
                        if (data.columns.length > 1) {
                           saveStateForUndo();
                           const newColumns = data.columns.filter((_, idx) => idx !== selectedCell.col);
                           const newRows = data.rows.map(row => 
                              row.filter((_, idx) => idx !== selectedCell.col)
                           );
                           setData({ columns: newColumns, rows: newRows });
                           // Move selection left if we deleted the last column
                           if (selectedCell.col >= newColumns.length) {
                              setSelectedCell((prev) => ({ ...prev, col: newColumns.length - 1 }));
                           }
                        }
                     }
                     window.removeEventListener("keydown", handleSecondD);
                  };
                  window.addEventListener("keydown", handleSecondD);
                  setTimeout(() => window.removeEventListener("keydown", handleSecondD), 1000);
                  break;

               // Column operations using capital letters
               case "A": // Add column after current
                  saveStateForUndo();
                  const newColumns = [...data.columns];
                  newColumns.splice(selectedCell.col + 1, 0, `Parameter ${data.columns.length + 1}`);
                  const newRows = data.rows.map(row => {
                     const newRow = [...row];
                     newRow.splice(selectedCell.col + 1, 0, "");
                     return newRow;
                  });
                  setData({ columns: newColumns, rows: newRows });
                  setSelectedCell((prev) => ({ ...prev, col: prev.col + 1 }));
                  break;

               // Cell operations
               case "x": // Clear cell
                  saveStateForUndo();
                  if (selectedCell.row === -2) {
                     updateProblem("");
                  } else if (selectedCell.row === -1) {
                     updateColumn(selectedCell.col, "");
                  } else {
                     updateCell(selectedCell.row, selectedCell.col, "");
                  }
                  break;
               
               // Undo/Redo
               case "u": // Undo
                  performUndo();
                  break;
               case "r":
                  if (e.ctrlKey) { // Ctrl+R for redo
                     performRedo();
                  }
                  break;
               
               // Help
               case "?": // Show help
                  setShowHelp(true);
                  break;
            }
         }

         // Handle insert mode
         if (mode === "insert" && e.key === "Escape") {
            setMode("normal");
            // Save state when leaving insert mode
            saveStateForUndo();
            // Blur current input
            (document.activeElement as HTMLElement)?.blur();
         }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
   }, [vimEnabled, mode, data, selectedCell, searchMatches, currentMatchIndex, showHelp]);

   // Search functionality
   const performSearch = (query: string) => {
      if (!query) {
         setSearchMatches([]);
         return;
      }

      const matches: Array<{ row: number; col: number }> = [];
      const lowerQuery = query.toLowerCase();

      // Search in problem statement
      if (data.problem && data.problem.toLowerCase().includes(lowerQuery)) {
         matches.push({ row: -2, col: 0 });
      }

      // Search in headers
      data.columns.forEach((col, colIndex) => {
         if (col.toLowerCase().includes(lowerQuery)) {
            matches.push({ row: -1, col: colIndex });
         }
      });

      // Search in cells
      data.rows.forEach((row, rowIndex) => {
         row.forEach((cell, colIndex) => {
            if (cell.toLowerCase().includes(lowerQuery)) {
               matches.push({ row: rowIndex, col: colIndex });
            }
         });
      });

      setSearchMatches(matches);
      if (matches.length > 0) {
         setCurrentMatchIndex(0);
         setSelectedCell(matches[0]);
      }
   };

   return (
      <div className="zwicky-box">
         <div 
            className={`problem-statement ${
               vimEnabled && selectedCell.row === -2 ? `selected ${mode}` : ""
            }`}
            onClick={() => {
               if (vimEnabled) {
                  setSelectedCell({ row: -2, col: 0 });
               }
            }}
         >
            <label htmlFor="problem">Problem:</label>
            <input
               id="problem"
               type="text"
               value={data.problem || ""}
               onChange={(e) => updateProblem(e.target.value)}
               placeholder="What problem are you solving?"
               readOnly={vimEnabled && mode === "normal"}
               tabIndex={vimEnabled && mode === "normal" ? -1 : 0}
            />
         </div>

         <table className="zwicky-table">
            <thead>
               <tr>
                  {data.columns.map((col, colIndex) => (
                     <th 
                        key={colIndex}
                        className={
                           vimEnabled && selectedCell.row === -1 && selectedCell.col === colIndex 
                              ? `selected ${mode}` 
                              : ""
                        }
                        onClick={() => {
                           if (vimEnabled) {
                              setSelectedCell({ row: -1, col: colIndex });
                           }
                        }}
                     >
                        <input
                           type="text"
                           value={col}
                           onChange={(e) =>
                              updateColumn(colIndex, e.target.value)
                           }
                           placeholder="Parameter name"
                           data-row="-1"
                           data-col={colIndex}
                           readOnly={vimEnabled && mode === "normal"}
                           tabIndex={vimEnabled && mode === "normal" ? -1 : 0}
                        />
                     </th>
                  ))}
               </tr>
            </thead>
            <tbody>
               {data.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                     {row.map((cell, colIndex) => (
                        <td 
                           key={colIndex}
                           className={
                              vimEnabled && selectedCell.row === rowIndex && selectedCell.col === colIndex 
                                 ? `selected ${mode}` 
                                 : ""
                           }
                           onClick={() => {
                              if (vimEnabled) {
                                 setSelectedCell({ row: rowIndex, col: colIndex });
                              }
                           }}
                        >
                           <input
                              type="text"
                              value={cell}
                              onChange={(e) =>
                                 updateCell(rowIndex, colIndex, e.target.value)
                              }
                              placeholder="Value"
                              data-row={rowIndex}
                              data-col={colIndex}
                              readOnly={vimEnabled && mode === "normal"}
                              tabIndex={vimEnabled && mode === "normal" ? -1 : 0}
                           />
                        </td>
                     ))}
                  </tr>
               ))}
            </tbody>
         </table>
         
         <VimInfo 
            vimEnabled={vimEnabled} 
            mode={mode} 
            onToggleVim={() => setVimEnabled(!vimEnabled)} 
         />
         
         {!vimEnabled && (
            <Controls
               onAddColumn={addColumn}
               onAddRow={addRow}
               onDeleteColumn={() => deleteColumn(data.columns.length - 1)}
               onDeleteRow={() => deleteRow(data.rows.length - 1)}
               canDeleteColumn={data.columns.length > 1}
               canDeleteRow={data.rows.length > 1}
               saveStatus={saveStatus}
            />
         )}

         {vimEnabled && (
            <div className="vim-guide">
               <div className="section">
                  <span className="key">h</span><span className="key">j</span><span className="key">k</span><span className="key">l</span> navigate • 
                  <span className="key">i</span><span className="key">a</span> insert • 
                  <span className="key">ESC</span> normal • 
                  <span className="key">/</span> search • 
                  <span className="key">n</span><span className="key">N</span> next/prev
               </div>
               <div className="section">
                  <span className="key">o</span><span className="key">O</span> add row • 
                  <span className="key">dd</span> delete row • 
                  <span className="key">A</span> add column • 
                  <span className="key">dc</span> delete column • 
                  <span className="key">x</span> clear • 
                  <span className="key">u</span> undo
               </div>
            </div>
         )}

         {showSearchInput && (
            <div className="search-input-container">
               <span>/</span>
               <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                     setSearchQuery(e.target.value);
                     performSearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                     if (e.key === "Enter") {
                        setShowSearchInput(false);
                        setMode("normal");
                     }
                  }}
                  autoFocus
                  placeholder="Search..."
               />
               {searchMatches.length > 0 && (
                  <span className="search-status">
                     {currentMatchIndex + 1}/{searchMatches.length}
                  </span>
               )}
            </div>
         )}

         {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
      </div>
   );
}
