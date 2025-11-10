import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "../common/Button";
import { Card, CardTitle, CardDescription } from "../common/Card";

export const Actions = () => {
  const generateNumbers = useAction(api.myFunctions.generateRandomNumbers);
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <Card>
      <CardTitle>Actions</CardTitle>
      <CardDescription>Testing action functions</CardDescription>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant="info"
          disabled={isGenerating}
          onClick={() => {
            setIsGenerating(true);
            generateNumbers({ count: 5, min: 1, max: 100 })
              .then((nums) => {
                alert(`Generated numbers: ${nums.join(", ")}`);
              })
              .catch((err) => {
                alert(`Error: ${err.message}`);
              })
              .finally(() => {
                setIsGenerating(false);
              });
          }}
        >
          {isGenerating ? "Generating..." : "Generate 5 Random Numbers"}
        </Button>
      </div>
    </Card>
  );
};
