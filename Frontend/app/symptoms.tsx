import { useState, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Button } from "@/components/ui/Button";
import { DualToneBackground } from "@/components/ui/DualToneBackground";
import { useRouter, useNavigation } from "expo-router";

type QuestionnaireProps = {
  onComplete: (answers: boolean[]) => Promise<void>;
  onCancel?: () => void;
};

export default function Questionnaire({
  onComplete,
  onCancel,
}: QuestionnaireProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: "Symptoms Quiz",
      headerShown: true,
    });
  }, [navigation]);

  const questions = [
    "Do you have a cough?",
    "Do you have a fever?",
    "Is the affected area painful?",
    "Have you noticed any swelling?",
    "Does the affected area itch?",
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onComplete(answers);
      router.replace("/home");
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to submit. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleAnswer = (answer: boolean) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setAllQuestionsAnswered(true);
    }
  };

  const isYesSelected = answers[currentQuestionIndex] === true;
  const isNoSelected = answers[currentQuestionIndex] === false;

  if (allQuestionsAnswered) {
    return (
      <DualToneBackground>
        <View style={styles.content}>
          <Text style={styles.question}>Thank you for your responses!</Text>

          <View style={styles.submitContainer}>
            {isSubmitting ? (
              <ActivityIndicator size="large" color="#7928CA" />
            ) : (
              <Button
                title="Submit"
                onPress={handleSubmit}
                variant="primary"
                style={styles.submitButton}
                disabled={isSubmitting}
              />
            )}
            {submitError && <Text style={styles.errorText}>{submitError}</Text>}
          </View>
        </View>
      </DualToneBackground>
    );
  }

  return (
    <DualToneBackground>
      <View style={styles.content}>
        <Text style={styles.counter}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>

        <Text style={styles.question}>{questions[currentQuestionIndex]}</Text>

        <View style={styles.buttons}>
          <Button
            title="Yes"
            onPress={() => handleAnswer(true)}
            variant={isYesSelected ? "primary" : "secondary"}
            style={[
              styles.button,
              isYesSelected && { backgroundColor: "#7928CA" },
              !isYesSelected && { backgroundColor: "#E5E7EB" },
            ]}
            textStyle={[
              isYesSelected && { color: "#FFFFFF" },
              !isYesSelected && { color: "#000000" },
            ]}
          />
          <Button
            title="No"
            onPress={() => handleAnswer(false)}
            variant={isNoSelected ? "primary" : "secondary"}
            style={[
              styles.button,
              isNoSelected && { backgroundColor: "#7928CA" },
              !isNoSelected && { backgroundColor: "#E5E7EB" },
            ]}
            textStyle={[
              isNoSelected && { color: "#FFFFFF" },
              !isNoSelected && { color: "#000000" },
            ]}
          />
        </View>
      </View>
    </DualToneBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  counter: {
    color: "white",
    fontSize: 18,
    marginBottom: 30,
  },
  question: {
    color: "white",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 100,
    paddingHorizontal: 20,
  },
  buttons: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
    marginBottom: 30,
  },
  button: {
    width: "40%",
    height: 35,
  },
  submitContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  submitButton: {
    width: "60%",
    alignSelf: "center",
  },
  errorText: {
    color: "red",
    marginTop: 10,
    textAlign: "center",
  },
});
