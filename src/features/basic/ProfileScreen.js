import React, { useCallback, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Avatar, Button, Chip } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { api, errorMessage } from "../../services/api";
import { useLogin } from "../../context/LoginProvider";
import { openDocument } from "../../services/openDocument";
import { Action, Card, ErrorText, Field, Screen, Title, s } from "./ui";
import { avatarSource } from "./LegacyScreens";

async function uploadAsset(asset, kind, profileRole) {
  const form = new FormData();
  const name =
    asset.fileName ||
    asset.name ||
    (kind === "photo" ? "profile.jpg" : "document.pdf");
  if (Platform.OS === "web") {
    const file = asset.file || (await fetch(asset.uri).then((r) => r.blob()));
    form.append("file", file, name);
  } else
    form.append("file", {
      uri: asset.uri,
      name,
      type:
        asset.mimeType || (kind === "photo" ? "image/jpeg" : "application/pdf"),
    });
  form.append("kind", kind);
  form.append("profileRole", profileRole);
  return api.post("/files", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
}

export default function ProfileScreen({ navigation }) {
  const { user, userRole, reloadProfile } = useLogin();
  const worker = userRole === "LABOUR";
  const [form, setForm] = useState(null);
  const [categories, setCategories] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const change = (key) => (value) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api.get(worker ? "/labours/me" : "/customers/me");
      const profile = worker
        ? {
            ...data.publicProfile,
            ...data,
            languages: data.publicProfile.languages.join(", "),
          }
        : data;
      setForm(profile);
      setPhoto(
        worker ? data.publicProfile.profileImageId : data.profileImageId,
      );
      setDocumentId(data.documentId);
      if (worker) setCategories(await api.get("/categories"));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [worker]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  async function save() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (worker)
        await api.put("/labours/me", {
          name: form.name,
          mobileNumber: form.mobileNumber,
          identificationNumber: form.identificationNumber,
          jobRoles: form.jobRoles,
          aboutMe: form.aboutMe,
          gender: form.gender,
          languages: form.languages
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        });
      else
        await api.put("/customers/me", {
          name: form.name,
          mobileNumber: form.mobileNumber,
          address: form.address,
        });
      await reloadProfile();
      setMessage("Perfil actualizado.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function pick(kind) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      let result;
      if (kind === "photo") {
        if (Platform.OS !== "web") {
          const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            setError(
              "Permite el acceso a tus fotos para seleccionar una imagen.",
            );
            return;
          }
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else
        result = await DocumentPicker.getDocumentAsync({
          type: "application/pdf",
          copyToCacheDirectory: true,
        });
      if (result.canceled || !result.assets?.length) return;
      const file = await uploadAsset(
        result.assets[0],
        kind,
        worker || kind === "document" ? "LABOUR" : "CUSTOMER",
      );
      if (kind === "photo") setPhoto(file.id);
      else setDocumentId(file.id);
      await reloadProfile();
      setMessage(
        kind === "photo"
          ? "Foto actualizada."
          : "Documento guardado de forma privada.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    setError("");
    try {
      await openDocument(documentId);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title>Datos personales</Title>
      <Text style={[s.muted, { marginBottom: 16 }]}>
        {user.email} · {worker ? "Trabajador" : "Cliente"}
      </Text>
      <ErrorText>{error}</ErrorText>
      {!!error && !form && <Button onPress={load}>Reintentar</Button>}
      {!!message && (
        <Text accessibilityRole="alert" style={[s.text, { marginBottom: 12 }]}>
          {message}
        </Text>
      )}
      {form && (
        <>
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Avatar.Image size={120} source={avatarSource(photo)} />
            <Button
              icon="camera-outline"
              disabled={busy}
              textColor="#F97300"
              onPress={() => pick("photo")}
            >
              Cambiar foto (JPEG/PNG, hasta 5 MB)
            </Button>
          </View>
          <Field
            label="Nombre"
            value={form.name}
            onChangeText={change("name")}
          />
          <Field
            label="Teléfono internacional"
            value={form.mobileNumber}
            onChangeText={change("mobileNumber")}
            keyboardType="phone-pad"
          />
          {worker ? (
            <>
              <Field
                label="Documento de identidad"
                value={form.identificationNumber}
                onChangeText={change("identificationNumber")}
              />
              <Title>Oficios</Title>
              <View style={[s.row, { marginBottom: 18 }]}>
                {categories.map((c) => (
                  <Chip
                    key={c.code}
                    selected={form.jobRoles.includes(c.code)}
                    onPress={() =>
                      change("jobRoles")(
                        form.jobRoles.includes(c.code)
                          ? form.jobRoles.filter((v) => v !== c.code)
                          : [...form.jobRoles, c.code],
                      )
                    }
                  >
                    {c.name}
                  </Chip>
                ))}
              </View>
              <Field
                label="Acerca de mí"
                multiline
                value={form.aboutMe}
                onChangeText={change("aboutMe")}
              />
              <Field
                label="Género (opcional)"
                value={form.gender}
                onChangeText={change("gender")}
              />
              <Field
                label="Idiomas, separados por comas"
                value={form.languages}
                onChangeText={change("languages")}
              />
              <Card>
                <Text style={s.text}>
                  {documentId
                    ? "Documento PDF adjunto. Solo tú puedes descargarlo desde tu cuenta."
                    : "Aún no has adjuntado un documento."}
                </Text>
                <Button
                  disabled={busy}
                  textColor="#F97300"
                  onPress={() => pick("document")}
                >
                  Adjuntar PDF (hasta 10 MB)
                </Button>
                {documentId && (
                  <Button disabled={busy} onPress={download}>
                    Abrir mi documento
                  </Button>
                )}
              </Card>
            </>
          ) : (
            <Field
              label="Dirección"
              value={form.address}
              onChangeText={change("address")}
            />
          )}
          <Action disabled={busy} loading={busy} onPress={save}>
            Guardar perfil
          </Action>
        </>
      )}
    </Screen>
  );
}

export function ChangePasswordScreen() {
  const { signOut } = useLogin();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (newPassword !== confirm)
      return setError("Las contraseñas no coinciden.");
    setBusy(true);
    setError("");
    try {
      await api.put("/auth/password", { currentPassword, newPassword });
      await signOut();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title>Cambiar contraseña</Title>
      <Field
        label="Contraseña actual"
        password
        value={currentPassword}
        onChangeText={setCurrent}
      />
      <Field
        label="Nueva contraseña (mínimo 8 caracteres)"
        password
        value={newPassword}
        onChangeText={setNew}
      />
      <Field
        label="Confirmar nueva contraseña"
        password
        value={confirm}
        onChangeText={setConfirm}
      />
      <ErrorText>{error}</ErrorText>
      <Text style={s.muted}>
        Después del cambio deberás iniciar sesión nuevamente.
      </Text>
      <Action disabled={busy} loading={busy} onPress={submit}>
        Actualizar contraseña
      </Action>
    </Screen>
  );
}
