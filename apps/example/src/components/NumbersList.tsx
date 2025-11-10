import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Card, CardContent, CardTitle, CardDescription } from "../common/Card";

export const NumbersList = () => {
  const { numbers } =
    useQuery(api.myFunctions.listNumbersSimple, { count: 10 }) ?? {};

  const addNumber = useMutation(api.myFunctions.addNumber);
  const addNumberWithOptional = useMutation(
    api.myFunctions.addNumberWithOptional,
  );
  const addWithMetadata = useMutation(api.myFunctions.addNumberWithMetadata);
  const addPositive = useMutation(api.myFunctions.addPositiveNumber);
  const deleteAll = useMutation(api.myFunctions.deleteAllNumbers);

  const [label, setLabel] = useState("");

  if (numbers === undefined) {
    return (
      <Card>
        <p className="text-center">Loading numbers...</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Numbers List</CardTitle>
      <CardDescription>
        Testing PropertyValidators and Zod validators
      </CardDescription>

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => {
            void addNumber({ value: Math.floor(Math.random() * 100) - 50 });
          }}
        >
          Add Random (-50 to 50)
        </Button>

        <Button
          onClick={() => {
            void addNumberWithOptional({ value: 42 });
            void addNumberWithOptional({ value: 66, label: "66" });
          }}
        >
          Add Number With Optional
        </Button>

        <Button
          variant="success"
          onClick={() => {
            void addPositive({
              value: Math.floor(Math.random() * 100) + 1,
              description: "Random positive number",
            });
          }}
        >
          Add Positive (Zod validation)
        </Button>

        <Button
          variant="info"
          onClick={() => {
            void addWithMetadata({
              value: Math.floor(Math.random() * 10),
              label: label || undefined,
              tags: ["test", "demo"],
            });
          }}
        >
          Add with Metadata (optional fields)
        </Button>

        <Button
          variant="danger"
          onClick={() => {
            if (confirm("Delete all numbers?")) {
              void deleteAll({});
            }
          }}
        >
          Delete All
        </Button>
      </div>

      <Input
        type="text"
        placeholder="Optional label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <CardContent>
        <p className="font-mono text-sm">
          Numbers ({numbers.length}):{" "}
          {numbers.length === 0
            ? "Click a button to add numbers!"
            : numbers.join(", ")}
        </p>
      </CardContent>
    </Card>
  );
};
