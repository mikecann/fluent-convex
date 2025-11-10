import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "../common/Button";
import { Card, CardContent, CardTitle, CardDescription } from "../common/Card";
import { SuccessAlert, ErrorAlert } from "../common/Alert";

export const AuthTesting = () => {
  const addNumberAuth = useMutation(api.myFunctions.addNumberAuth);
  const addNumberAuthAction = useAction(api.myFunctions.addNumberAuthAction);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  return (
    <Card>
      <CardTitle>Authentication Testing</CardTitle>
      <CardDescription>
        Testing middleware authentication - these routes should fail with
        "Unauthorized" errors when not authenticated
      </CardDescription>

      <div className="flex flex-col gap-4">
        <CardContent>
          <h3 className="font-semibold mb-2">Mutation Test (addNumberAuth)</h3>
          <div className="flex gap-2 flex-wrap mb-2">
            <Button
              variant="warning"
              onClick={() => {
                setMutationError(null);
                setMutationSuccess(null);
                addNumberAuth({ value: Math.floor(Math.random() * 100) })
                  .then((id) => {
                    setMutationSuccess(
                      `Success (unexpected): Added number with ID ${id}`,
                    );
                  })
                  .catch((err) => {
                    setMutationError(
                      err.message || "Unauthorized (expected error)",
                    );
                  });
              }}
            >
              Try Add Number (Auth Required)
            </Button>
          </div>
          {mutationSuccess && <SuccessAlert>{mutationSuccess}</SuccessAlert>}
          {mutationError && <ErrorAlert>{mutationError}</ErrorAlert>}
          {!mutationError && !mutationSuccess && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Click the button above to test the auth-protected mutation
            </p>
          )}
        </CardContent>

        <CardContent>
          <h3 className="font-semibold mb-2">
            Action Test (addNumberAuthAction)
          </h3>
          <div className="flex gap-2 flex-wrap mb-2">
            <Button
              variant="warning"
              onClick={() => {
                setActionError(null);
                setActionSuccess(null);
                addNumberAuthAction({ value: Math.floor(Math.random() * 100) })
                  .then((result) => {
                    setActionSuccess(
                      `Success (unexpected): Added ${result.value} as user ${result.user}, ID: ${result.id}`,
                    );
                  })
                  .catch((err) => {
                    setActionError(
                      err.message || "Unauthorized (expected error)",
                    );
                  });
              }}
            >
              Try Add Number via Action (Auth Required)
            </Button>
          </div>
          {actionSuccess && <SuccessAlert>{actionSuccess}</SuccessAlert>}
          {actionError && <ErrorAlert>{actionError}</ErrorAlert>}
          {!actionError && !actionSuccess && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Click the button above to test the auth-protected action
            </p>
          )}
        </CardContent>
      </div>
    </Card>
  );
};
