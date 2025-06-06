import { DialogClose } from "@radix-ui/react-dialog";
import { Form, useNavigation, useSubmit } from "@remix-run/react";
import { useCallback, useEffect, useRef } from "react";
import { type UseDataFunctionReturn, useTypedFetcher } from "remix-typedjson";
import { JSONEditor } from "~/components/code/JSONEditor";
import { EnvironmentCombo } from "~/components/environments/EnvironmentLabel";
import { Button } from "~/components/primitives/Buttons";
import { DialogContent, DialogHeader } from "~/components/primitives/Dialog";
import { Header3 } from "~/components/primitives/Headers";
import { InputGroup } from "~/components/primitives/InputGroup";
import { Label } from "~/components/primitives/Label";
import { Paragraph } from "~/components/primitives/Paragraph";
import { Select, SelectItem } from "~/components/primitives/Select";
import { Spinner, SpinnerWhite } from "~/components/primitives/Spinner";
import { type loader } from "~/routes/resources.taskruns.$runParam.replay";

type ReplayRunDialogProps = {
  runFriendlyId: string;
  failedRedirect: string;
};

export function ReplayRunDialog({ runFriendlyId, failedRedirect }: ReplayRunDialogProps) {
  return (
    <DialogContent key={`replay`} className="md:max-w-xl">
      <ReplayContent runFriendlyId={runFriendlyId} failedRedirect={failedRedirect} />
    </DialogContent>
  );
}

function ReplayContent({ runFriendlyId, failedRedirect }: ReplayRunDialogProps) {
  const fetcher = useTypedFetcher<typeof loader>();
  const isLoading = fetcher.state === "loading";

  useEffect(() => {
    fetcher.load(`/resources/taskruns/${runFriendlyId}/replay`);
  }, [runFriendlyId]);

  return (
    <>
      <DialogHeader>Replay this run</DialogHeader>
      {isLoading ? (
        <div className="grid place-items-center p-6">
          <Spinner />
        </div>
      ) : fetcher.data ? (
        <ReplayForm
          {...fetcher.data}
          failedRedirect={failedRedirect}
          runFriendlyId={runFriendlyId}
        />
      ) : (
        <>Failed to get run data</>
      )}
    </>
  );
}

function ReplayForm({
  payload,
  payloadType,
  environment,
  environments,
  failedRedirect,
  runFriendlyId,
}: UseDataFunctionReturn<typeof loader> & { failedRedirect: string; runFriendlyId: string }) {
  const navigation = useNavigation();
  const submit = useSubmit();
  const currentJson = useRef<string>(payload);
  const formAction = `/resources/taskruns/${runFriendlyId}/replay`;
  const isSubmitting = navigation.formAction === formAction;

  const editablePayload =
    payloadType === "application/json" || payloadType === "application/super+json";

  const submitForm = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      const formData = new FormData(e.currentTarget);
      const data: Record<string, string> = {
        environment: formData.get("environment") as string,
        failedRedirect: formData.get("failedRedirect") as string,
      };

      if (editablePayload) {
        data.payload = currentJson.current;
      }

      submit(data, {
        action: formAction,
        method: "post",
      });
      e.preventDefault();
    },
    [currentJson]
  );

  return (
    <Form action={formAction} method="post" onSubmit={(e) => submitForm(e)} className="pt-2">
      {editablePayload ? (
        <>
          <Paragraph className="mb-3">
            Replaying will create a new run using the same or modified payload, executing against
            the latest version in your selected environment.
          </Paragraph>
          <Header3 spacing>Payload</Header3>
          <div className="mb-3 max-h-[70vh] min-h-40 overflow-y-auto rounded-sm border border-grid-dimmed bg-charcoal-900 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-charcoal-600">
            <JSONEditor
              autoFocus
              defaultValue={currentJson.current}
              readOnly={false}
              basicSetup
              onChange={(v) => {
                currentJson.current = v;
              }}
              showClearButton={false}
              showCopyButton={false}
              height="100%"
              min-height="100%"
              max-height="100%"
            />
          </div>
        </>
      ) : null}
      <InputGroup>
        <Label>Environment</Label>
        <Select
          id="environment"
          name="environment"
          placeholder="Select an environment"
          defaultValue={environment.id}
          items={environments}
          dropdownIcon
          variant="tertiary/medium"
          className="w-fit pl-1"
          filter={{
            keys: [
              (item) => item.type.replace(/\//g, " ").replace(/_/g, " "),
              (item) => item.branchName?.replace(/\//g, " ").replace(/_/g, " ") ?? "",
            ],
          }}
          text={(value) => {
            const env = environments.find((env) => env.id === value)!;
            return (
              <div className="flex items-center pl-1 pr-2">
                <EnvironmentCombo environment={env} />
              </div>
            );
          }}
        >
          {(matches) =>
            matches.map((env) => (
              <SelectItem key={env.id} value={env.id}>
                <EnvironmentCombo environment={env} />
              </SelectItem>
            ))
          }
        </Select>
      </InputGroup>
      <input type="hidden" name="failedRedirect" value={failedRedirect} />
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-grid-dimmed pt-3.5">
        <DialogClose asChild>
          <Button variant="tertiary/medium">Cancel</Button>
        </DialogClose>
        <Button
          type="submit"
          variant="primary/medium"
          LeadingIcon={isSubmitting ? SpinnerWhite : undefined}
          disabled={isSubmitting}
          shortcut={{ modifiers: ["mod"], key: "enter", enabledOnInputElements: true }}
        >
          {isSubmitting ? "Replaying..." : "Replay run"}
        </Button>
      </div>
    </Form>
  );
}
