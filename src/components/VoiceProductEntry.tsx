import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mic, MicOff, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VoiceProductEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductParsed: (fields: {
    name?: string;
    category?: string;
    cost_price?: string;
    selling_price?: string;
    stock_qty?: string;
    sku?: string;
    unit_type?: string;
  }) => void;
  isRestaurant: boolean;
}

export function VoiceProductEntry({ open, onOpenChange, onProductParsed, isRestaurant }: VoiceProductEntryProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        toast.error(`Speech error: ${event.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setTranscript("");
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const parseWithAI = async () => {
    if (!transcript.trim()) {
      toast.error("No speech captured. Try again.");
      return;
    }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-voice-product", {
        body: { transcript: transcript.trim(), isRestaurant },
      });
      if (error) throw error;
      if (data?.product) {
        onProductParsed(data.product);
        toast.success("Product details filled from voice!");
        onOpenChange(false);
        setTranscript("");
      } else {
        toast.error("Could not parse product details. Try describing more clearly.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to parse voice input");
    } finally {
      setParsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { stopListening(); setTranscript(""); } onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-accent" />
            Voice Product Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isRestaurant
              ? 'Say something like "Chicken burger, main dishes category, selling price 2500 naira"'
              : 'Say "Indomie carton, SKU IND-001, cost price 500, selling price 700, stock 50 cartons"'}
          </p>

          <div className="flex justify-center">
            <button
              onClick={listening ? stopListening : startListening}
              className={`h-20 w-20 rounded-full flex items-center justify-center transition-all ${
                listening
                  ? "bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/30"
                  : "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
              }`}
            >
              {listening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {listening ? "Listening... tap to stop" : "Tap the mic to start speaking"}
          </p>

          {transcript && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-1">Captured:</p>
              <p className="text-sm text-foreground">{transcript}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { stopListening(); setTranscript(""); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            disabled={!transcript.trim() || parsing || listening}
            onClick={parseWithAI}
            className="gap-2"
          >
            {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {parsing ? "Parsing..." : "Fill Product Fields"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
